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
} from "../../lib/db";
import { setLoyaltyPoints, sendWalletMessage } from "../../lib/walletObjects";
import { getRoleAsync } from "../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
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
          await setLoyaltyPoints(referredByObjectId, updated.points);
          await sendWalletMessage(
            referredByObjectId,
            "Un ami vous a rejoint !",
            `+1 point grâce à votre parrainage. Vous avez maintenant ${updated.points} point(s).`
          );
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
