// pages/api/create-pass.js
//
// Endpoint appelé par la page d'inscription quand le client clique sur
// "Ajouter à Google Wallet". Reçoit un prénom (et éventuellement un code
// de parrainage), enregistre le client en base, ajoute le tampon bonus
// de parrainage si besoin, et renvoie l'URL du pass + son propre lien de
// parrainage à partager.

import { v4 as uuidv4 } from "uuid";
import { buildSaveToWalletUrl } from "../../lib/wallet";
import { createClient, addPoints, REWARD_THRESHOLD } from "../../lib/db";
import { setLoyaltyPoints, sendWalletMessage } from "../../lib/walletObjects";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const { prenom, ref } = req.body || {};
    const objectSuffix = `client_${uuidv4().replace(/-/g, "")}`;
    const accountName = (prenom || "").trim() || "Client Fidélions";

    const { url, objectId } = buildSaveToWalletUrl({
      objectSuffix,
      accountName,
    });

    const { record, referredByObjectId } = await createClient({
      objectId,
      prenom: accountName,
      referredByCode: ref,
    });

    // Si un tampon bonus de parrainage a été accordé au nouveau client,
    // il faut regénérer le lien Wallet avec le bon solde de départ.
    let finalUrl = url;
    if (record.points > 0) {
      const rebuilt = buildSaveToWalletUrl({
        objectSuffix,
        accountName,
        initialPoints: record.points,
      });
      finalUrl = rebuilt.url;
    }

    // 2) Si un parrain existe, on lui ajoute aussi un tampon et on le
    //    prévient — mais on ne bloque jamais l'inscription du nouveau
    //    client si ça échoue (ex: parrain sur une ancienne carte de test).
    if (referredByObjectId) {
      try {
        const updated = await addPoints(referredByObjectId, 1);
        if (updated) {
          await setLoyaltyPoints(referredByObjectId, updated.points);
          await sendWalletMessage(
            referredByObjectId,
            "Un ami vous a rejoint !",
            `+1 tampon grâce à votre parrainage. Vous avez maintenant ${updated.points} tampon(s).`
          );
        }
      } catch (err) {
        console.error("Erreur bonus parrainage :", err);
      }
    }

    return res.status(200).json({
      url: finalUrl,
      referralCode: record.referralCode,
      referralUrl: `${getBaseUrl(req)}/?ref=${record.referralCode}`,
      points: record.points,
      rewardThreshold: REWARD_THRESHOLD,
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
