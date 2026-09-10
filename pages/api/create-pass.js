// pages/api/create-pass.js
//
// Endpoint appelé par la page d'inscription d'UN restaurant (/r/[slug])
// quand le client clique sur "Ajouter à Google Wallet". Reçoit le slug du
// restaurant (pour savoir de quel commerçant/quelle classe Wallet il
// s'agit), un prénom (et éventuellement un code de parrainage), enregistre
// le client en base, ajoute le point bonus de parrainage si besoin, et
// renvoie l'URL du pass + son propre lien de parrainage à partager.

import { v4 as uuidv4 } from "uuid";
import { buildSaveToWalletUrl } from "../../lib/wallet";
import { createClient, addPoints, getSettings, getMerchantBySlug } from "../../lib/db";
import { setLoyaltyPoints, sendWalletMessage } from "../../lib/walletObjects";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const { slug, prenom, email, telephone, ref } = req.body || {};

    const merchant = await getMerchantBySlug(slug);
    if (!merchant || !merchant.walletClassId) {
      return res.status(404).json({ error: "Commerce introuvable." });
    }

    const objectSuffix = `client_${uuidv4().replace(/-/g, "")}`;
    const accountName = (prenom || "").trim() || "Client Fidélions";

    const { url, objectId } = buildSaveToWalletUrl({
      classId: merchant.walletClassId,
      objectSuffix,
      accountName,
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
