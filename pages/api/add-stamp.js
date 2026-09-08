// pages/api/add-stamp.js
//
// Appelé depuis l'espace commerçant (/commercant) quand le commerçant
// scanne le QR d'un client ou clique "+1 tampon" manuellement. Met à
// jour la base de données ET la carte Wallet du client (solde + notif).

import { getClient, addPoints, REWARD_THRESHOLD } from "../../lib/db";
import { setLoyaltyPoints, sendWalletMessage } from "../../lib/walletObjects";
import { getRole } from "../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }
  // Le caissier peut ajouter des tampons comme le patron.
  if (!getRole(req)) {
    return res.status(401).json({ error: "Mot de passe commerçant incorrect." });
  }

  try {
    const { objectId } = req.body || {};
    if (!objectId) {
      return res.status(400).json({ error: "Identifiant client manquant." });
    }

    const existing = await getClient(objectId);
    if (!existing) {
      return res
        .status(404)
        .json({ error: "Client introuvable — le QR scanné ne correspond à aucune carte Fidélions." });
    }

    const updated = await addPoints(objectId, 1);
    await setLoyaltyPoints(objectId, updated.points);

    const rewardReached = updated.points > 0 && updated.points % REWARD_THRESHOLD === 0;
    const remaining = REWARD_THRESHOLD - (updated.points % REWARD_THRESHOLD || REWARD_THRESHOLD);

    await sendWalletMessage(
      objectId,
      rewardReached ? "Récompense débloquée !" : "+1 tampon !",
      rewardReached
        ? "Bravo, votre récompense est disponible — montrez cette carte en caisse."
        : `Plus que ${remaining} tampon(s) avant votre récompense.`
    );

    return res.status(200).json({ client: updated, rewardReached });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
