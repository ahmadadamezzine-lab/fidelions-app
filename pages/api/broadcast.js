// pages/api/broadcast.js
//
// Envoie une notification à TOUS les clients d'un coup (une "campagne"),
// par notification Wallet et/ou par email selon ce que le commerçant
// choisit. C'est l'équivalent de la fonction "notification push à tous
// les clients" montrée dans la vidéo Fidelix.

import { listClients, getMerchantById, getBranding, removeClientPushSubscription } from "../../lib/db";
import { sendWalletMessage } from "../../lib/walletObjects";
import { sendEmail } from "../../lib/email";
import { getRoleAsync, hasPermission } from "../../lib/auth";
import { sendPushNotification } from "../../lib/webpush";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }
  // Réservé au patron, ou à un employé (lien + code) avec la permission
  // "campagnes" activée dans l'onglet Équipe — pas au caissier classique.
  const auth = await getRoleAsync(req);
  const allowed = auth && (auth.role === "owner" || hasPermission(auth, "campagnes"));
  if (!allowed) {
    return res.status(401).json({ error: "Accès refusé." });
  }

  try {
    const { header, body, channels } = req.body || {};
    const cleanHeader = (header || "").trim();
    const cleanBody = (body || "").trim();
    const sendWallet = channels?.wallet !== false;
    const sendMail = channels?.email === true;
    const sendPush = channels?.push === true;

    if (!cleanHeader || !cleanBody) {
      return res.status(400).json({ error: "Le titre et le message sont obligatoires." });
    }
    if (cleanHeader.length > 60) {
      return res.status(400).json({ error: "Le titre est trop long (60 caractères max)." });
    }
    if (cleanBody.length > 300) {
      return res.status(400).json({ error: "Le message est trop long (300 caractères max)." });
    }
    if (!sendWallet && !sendMail && !sendPush) {
      return res.status(400).json({ error: "Choisis au moins un canal d'envoi (notification, email ou push)." });
    }

    // Les clients bloqués ne reçoivent aucune campagne.
    const clients = (await listClients(auth.merchantId)).filter((c) => !c.blocked);
    if (clients.length === 0) {
      return res.status(400).json({ error: "Aucun client à qui envoyer la campagne pour le moment." });
    }

    // Le client final doit reconnaître SON commerce dans sa boîte mail, pas
    // "Fidélions" (voir lib/email.js) — récupéré une seule fois, pas à
    // chaque email de la campagne.
    const [merchant, branding] = await Promise.all([
      getMerchantById(auth.merchantId),
      getBranding(auth.merchantId),
    ]);
    const restaurantName = merchant?.restaurantName || "Fidélions";

    // On envoie par petits groupes pour ne pas saturer les API d'un coup
    // si la base de clients grossit un jour.
    const CHUNK_SIZE = 8;
    let walletSent = 0;
    let walletFailed = 0;
    let emailSent = 0;
    let emailFailed = 0;
    let pushSent = 0;
    let pushFailed = 0;
    const clientsWithEmail = clients.filter((c) => c.email);
    const clientsWithPush = clients.filter((c) => c.pushSubscription);

    for (let i = 0; i < clients.length; i += CHUNK_SIZE) {
      const chunk = clients.slice(i, i + CHUNK_SIZE);
      const tasks = [];

      if (sendWallet) {
        for (const c of chunk) {
          tasks.push(
            sendWalletMessage(c.objectId, cleanHeader, cleanBody)
              .then(() => { walletSent++; })
              .catch(() => { walletFailed++; })
          );
        }
      }
      if (sendMail) {
        for (const c of chunk.filter((c) => c.email)) {
          tasks.push(
            sendEmail({
              to: c.email,
              subject: cleanHeader,
              text: cleanBody,
              fromName: restaurantName,
              logoUrl: branding?.logoUrl,
              accentColor: branding?.hexColor,
            })
              .then(() => { emailSent++; })
              .catch(() => { emailFailed++; })
          );
        }
      }
      if (sendPush) {
        for (const c of chunk.filter((c) => c.pushSubscription)) {
          tasks.push(
            sendPushNotification(c.pushSubscription, { title: cleanHeader, body: cleanBody }).then(
              ({ sent, gone }) => {
                if (sent) {
                  pushSent++;
                } else {
                  pushFailed++;
                  if (gone) removeClientPushSubscription(auth.merchantId, c.objectId).catch(() => {});
                }
              }
            )
          );
        }
      }

      await Promise.allSettled(tasks);
    }

    return res.status(200).json({
      walletSent,
      walletFailed,
      emailSent,
      emailFailed,
      pushSent,
      pushFailed,
      emailEligible: clientsWithEmail.length,
      pushEligible: clientsWithPush.length,
      total: clients.length,
      sentWallet: sendWallet,
      sentEmail: sendMail,
      sentPush: sendPush,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
