// pages/api/create-pass.js
//
// Endpoint appelé dans deux cas :
// 1) la page d'inscription PUBLIQUE d'un restaurant (/r/[slug]), quand le
//    client crée lui-même sa carte — aucune authentification, le
//    restaurant est identifié par son `slug` ;
// 2) l'écran de scan employé (/scan/[token], voir "Nouveau client"), quand
//    un employé crée la carte EN CAISSE pour un client présent —
//    identifié via les en-têtes x-employee-token/x-employee-pin (mêmes
//    en-têtes que /api/add-stamp), sans avoir besoin du slug puisque le
//    token suffit à retrouver le commerce. Dans ce cas, la carte créée est
//    comptée pour le classement "cartes créées" de l'onglet Équipe.
// Dans les deux cas : enregistre le client en base, ajoute le point bonus
// de parrainage si besoin, et renvoie l'URL du pass + son propre lien de
// parrainage à partager.

import { v4 as uuidv4 } from "uuid";
import { buildSaveToWalletUrl } from "../../lib/wallet";
import {
  createClient,
  addPoints,
  getSettings,
  getMerchantBySlug,
  getMerchantById,
  getEstablishmentInfo,
  recordEmployeeCardCreated,
  getSubscriptionAccess,
  checkRateLimit,
  getBranding,
} from "../../lib/db";
import { setLoyaltyPoints, sendWalletMessage } from "../../lib/walletObjects";
import { getRoleAsync, getClientIp } from "../../lib/auth";
import { sendEmail } from "../../lib/email";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  // Protection anti-abus : cet endpoint est public (page /r/[slug], sans
  // authentification) — sans limite, un script pourrait créer des
  // milliers de fausses cartes. 20 créations/minute par IP est largement
  // suffisant pour un usage normal (client qui s'inscrit, employé qui
  // enregistre un client en caisse) et bloque un script en boucle.
  const ip = getClientIp(req);
  const withinLimit = await checkRateLimit(`create-pass:${ip}`, 20, 60).catch(() => true);
  if (!withinLimit) {
    return res.status(429).json({ error: "Trop de tentatives — réessaie dans une minute." });
  }

  try {
    const { slug, prenom, email, telephone, ref } = req.body || {};

    // La page publique /r/[slug] n'envoie aucun en-tête d'authentification
    // — getRoleAsync renvoie alors null et on retombe sur le slug, comme
    // avant. L'écran de scan employé envoie ses en-têtes habituels, donc le
    // commerce est déjà connu sans avoir besoin du slug.
    const auth = await getRoleAsync(req).catch(() => null);
    const merchant = auth?.merchantId ? await getMerchantById(auth.merchantId) : await getMerchantBySlug(slug);
    if (!merchant || !merchant.walletClassId) {
      return res.status(404).json({ error: "Commerce introuvable." });
    }

    // Verrou d'abonnement (voir add-stamp.js pour le même mécanisme) : un
    // commerce dont l'essai est expiré ne peut plus créer de nouvelles
    // cartes, que ce soit depuis sa page publique /r/[slug] ou depuis
    // l'écran de scan employé.
    const access = await getSubscriptionAccess(merchant.id);
    if (!access.allowed) {
      return res.status(402).json({
        error:
          access.status === "suspendu"
            ? "Ce commerce a un abonnement Fidélions suspendu — impossible de créer une carte pour le moment."
            : "L'essai gratuit de ce commerce est terminé — impossible de créer une nouvelle carte tant que l'abonnement n'est pas activé.",
        subscriptionBlocked: true,
        subscriptionStatus: access.status,
      });
    }

    const objectSuffix = `client_${uuidv4().replace(/-/g, "")}`;
    const accountName = (prenom || "").trim() || "Client Fidélions";
    const { googleReviewUrl } = await getEstablishmentInfo(merchant.id);

    const { url, objectId } = buildSaveToWalletUrl({
      classId: merchant.walletClassId,
      objectSuffix,
      accountName,
      reviewUrl: googleReviewUrl,
    });

    const { record, referredByObjectId } = await createClient({
      merchantId: merchant.id,
      objectId,
      prenom: accountName,
      email,
      telephone,
      referredByCode: ref,
    });

    // Si un point bonus de parrainage a été accordé au nouveau client,
    // il faut regénérer le lien Wallet avec le bon solde de départ.
    let finalUrl = url;
    if (record.points > 0) {
      const rebuilt = buildSaveToWalletUrl({
        classId: merchant.walletClassId,
        objectSuffix,
        accountName,
        initialPoints: record.points,
        reviewUrl: googleReviewUrl,
      });
      finalUrl = rebuilt.url;
    }

    // 2) Si un parrain existe, on lui ajoute aussi un point et on le
    //    prévient — mais on ne bloque jamais l'inscription du nouveau
    //    client si ça échoue (ex: parrain sur une ancienne carte de test).
    if (referredByObjectId) {
      try {
        const updated = await addPoints(merchant.id, referredByObjectId, 1);
        if (updated) {
          const parrainageHeader = "Un ami vous a rejoint !";
          const parrainageBody = `+1 point grâce à votre parrainage. Vous avez maintenant ${updated.points} point(s).`;
          await setLoyaltyPoints(referredByObjectId, updated.points);
          await sendWalletMessage(referredByObjectId, parrainageHeader, parrainageBody);
          // Même canal de secours par email que pour un point normal
          // (voir add-stamp.js) — la notif Wallet n'est pas garantie de
          // s'afficher sur tous les téléphones (Samsung notamment).
          if (updated.email) {
            try {
              const branding = await getBranding(merchant.id);
              await sendEmail({
                to: updated.email,
                subject: `${merchant.restaurantName} — ${parrainageHeader}`,
                text: `${parrainageBody}\n\nVotre carte de fidélité est à jour dans Google Wallet.`,
                fromName: merchant.restaurantName,
                logoUrl: branding?.logoUrl,
                accentColor: branding?.hexColor,
              });
            } catch (err) {
              console.error("Email de secours (parrainage) non envoyé :", err);
            }
          }
        }
      } catch (err) {
        console.error("Erreur bonus parrainage :", err);
      }
    }

    // Attribution à l'employé qui a créé la carte (uniquement si la
    // requête vient de l'écran de scan — voir getRoleAsync). Non bloquant :
    // un souci ici ne doit jamais empêcher la création de la carte.
    if (auth?.role === "employee" && auth.employeeId) {
      try {
        await recordEmployeeCardCreated(merchant.id, auth.employeeId);
      } catch (err) {
        console.error("Statistique employé (carte créée) non mise à jour :", err);
      }
    }

    const { rewardThreshold } = await getSettings(merchant.id);

    return res.status(200).json({
      url: finalUrl,
      referralCode: record.referralCode,
      referralUrl: `${getBaseUrl(req)}/r/${merchant.slug}?ref=${record.referralCode}`,
      points: record.points,
      rewardThreshold,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}

function getBaseUrl(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  return `${proto}://${host}`;
}
