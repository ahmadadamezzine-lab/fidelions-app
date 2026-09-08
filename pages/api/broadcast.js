// pages/api/broadcast.js
//
// Envoie une notification à TOUS les clients d'un coup (une "campagne"),
// par notification Wallet et/ou par email selon ce que le commerçant
// choisit. C'est l'équivalent de la fonction "notification push à tous
// les clients" montrée dans la vidéo Fidelix.

import { listClients } from "../../lib/db";
import { sendWalletMessage } from "../../lib/walletObjects";
import { sendEmail } from "../../lib/email";
import { getRole } from "../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }
  // Les campagnes restent réservées au patron (accès "owner"), pas au caissier.
  const role = getRole(req);
  if (role !== "owner") {
    return res.status(401).json({ error: "Réservé au compte principal du restaurant." });
  }

  try {
    const { header, body, channels } = req.body || {};
    const cleanHeader = (header || "").trim();
    const cleanBody = (body || "").trim();
    const sendWallet = channels?.wallet !== false;
    const sendMail = channels?.email === true;

    if (!cleanHeader || !cleanBody) {
      return res.status(400).json({ error: "Le titre et le message sont obligatoires." });
    }
    if (cleanHeader.length > 60) {
      return res.status(400).json({ error: "Le titre est trop long (60 caractères max)." });
    }
    if (cleanBody.length > 300) {
      return res.status(400).json({ error: "Le message est trop long (300 caractères max)." });
    }
    if (!sendWallet && !sendMail) {
      return res.status(400).json({ error: "Choisis au moins un canal d'envoi (notification et/ou email)." });
    }

    // Les clients bloqués ne reçoivent aucune campagne.
    const clients = (await listClients()).filter((c) => !c.blocked);
    if (clients.length === 0) {
      return res.status(400).json({ error: "Aucun client à qui envoyer la campagne pour le moment." });
    }

    // On envoie par petits groupes pour ne pas saturer les API d'un coup
    // si la base de clients grossit un jour.
    const CHUNK_SIZE = 8;
    let walletSent = 0;
    let walletFailed = 0;
    let emailSent = 0;
    let emailFailed = 0;
    const clientsWithEmail = clients.filter((c) => c.email);

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
            sendEmail({ to: c.email, subject: cleanHeader, text: cleanBody })
              .then(() => { emailSent++; })
              .catch(() => { emailFailed++; })
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
      emailEligible: clientsWithEmail.length,
      total: clients.length,
      sentWallet: sendWallet,
      sentEmail: sendMail,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
