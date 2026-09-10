// pages/api/add-stamp.js
//
// Appelé depuis l'espace commerçant (/commercant) ou depuis le lien
// employé (/scan/[token]) quand on scanne le QR d'un client ou qu'on
// clique "+1" manuellement. Met à jour la base de données ET la carte
// Wallet du client (solde + notif), en tenant compte du mode de fidélité
// choisi par le commerçant ("tampons" classique ou "points" à paliers).

import { getClient, addPoints, getLoyaltySettings, markTiersUnlocked, logStampEvent } from "../../lib/db";
import { setLoyaltyPoints, sendWalletMessage } from "../../lib/walletObjects";
import { getRoleAsync } from "../../lib/auth";
import { computeTamponsReward, computePointsRewards } from "../../lib/loyalty";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }
  // Le patron ET le lien employé (scan seul) peuvent ajouter un
  // tampon/point — c'est la seule action que ce dernier autorise.
  const auth = await getRoleAsync(req);
  if (!auth) {
    return res.status(401).json({ error: "Accès refusé." });
  }
  const merchantId = auth.merchantId;

  try {
    const { objectId } = req.body || {};
    if (!objectId) {
      return res.status(400).json({ error: "Identifiant client manquant." });
    }

    const existing = await getClient(merchantId, objectId);
    if (!existing) {
      return res
        .status(404)
        .json({ error: "Client introuvable — le QR scanné ne correspond à aucune carte Fidélions." });
    }
    if (existing.blocked) {
      return res
        .status(403)
        .json({ error: "Ce client est bloqué — débloque-le depuis la liste pour lui ajouter un tampon." });
    }

    const { type, tiers } = await getLoyaltySettings(merchantId);
    const updated = await addPoints(merchantId, objectId, 1);
    const unit = type === "points" ? "point" : "tampon";
    const walletLabel = type === "points" ? "Points" : "Tampons";

    // Un seul palier défini → carte classique, la récompense se
    // redéclenche à chaque multiple du seuil (comportement historique,
    // ex : "10 tampons = café offert", encore et encore). Plusieurs
    // paliers → chacun ne se débloque qu'UNE fois, comme des étapes
    // (ex : 20 = pizza, 30 = pizza + boisson) — quel que soit le libellé
    // "tampons"/"points" choisi, qui ne sert plus qu'au vocabulaire affiché.
    let rewardReached;
    let notifHeader;
    let notifBody;

    if (tiers.length > 1) {
      const result = computePointsRewards(updated.points, tiers, existing.unlockedTiers);
      rewardReached = result.rewardReached;
      if (rewardReached) {
        await markTiersUnlocked(merchantId, objectId, result.newlyUnlockedIndexes);
        notifHeader = "Récompense débloquée !";
        notifBody = `Bravo, ${result.label} est disponible — montrez cette carte en caisse.`;
      } else {
        notifHeader = `+1 ${unit} !`;
        notifBody = result.nextTierLabel
          ? `Plus que ${result.remaining} ${unit}(s) avant : ${result.nextTierLabel}.`
          : "Continuez, une récompense arrive bientôt !";
      }
    } else {
      const result = computeTamponsReward(updated.points, tiers);
      rewardReached = result.rewardReached;
      notifHeader = rewardReached ? "Récompense débloquée !" : `+1 ${unit} !`;
      notifBody = rewardReached
        ? `Bravo, ${result.label} est disponible — montrez cette carte en caisse.`
        : `Plus que ${result.remaining} ${unit}(s) avant : ${result.label}.`;
    }

    await setLoyaltyPoints(objectId, updated.points, walletLabel);
    await logStampEvent(merchantId, { objectId, delta: 1, rewardReached });

    // Le tampon lui-même (solde + base de données) est déjà enregistré à ce
    // stade. La notification est un bonus : si Google refuse (ex : quota de
    // 3 notifications/24h dépassé pour cette carte), on ne fait pas
    // échouer tout l'ajout de tampon pour autant — le commerçant voit
    // quand même la confirmation.
    let notificationSent = true;
    try {
      await sendWalletMessage(objectId, notifHeader, notifBody);
    } catch (err) {
      console.error("Notification Wallet non envoyée :", err);
      notificationSent = false;
    }

    return res.status(200).json({ client: updated, rewardReached, notificationSent });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
