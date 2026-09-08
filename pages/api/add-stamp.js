// pages/api/add-stamp.js
//
// Appelé depuis l'espace commerçant (/commercant) quand le commerçant
// scanne le QR d'un client ou clique "+1 tampon" manuellement. Met à
// jour la base de données ET la carte Wallet du client (solde + notif).

import { getClient, addPoints, getSettings } from "../../lib/db";
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
    if (existing.blocked) {
      return res
        .status(403)
        .json({ error: "Ce client est bloqué — débloque-le depuis la liste pour lui ajouter un tampon." });
    }

    const { rewardThreshold, rewardLabel } = await getSettings();

    const updated = await addPoints(objectId, 1);
    await setLoyaltyPoints(objectId, updated.points);

    const rewardReached = updated.points > 0 && updated.points % rewardThreshold === 0;
    const remaining = rewardThreshold - (updated.points % rewardThreshold || rewardThreshold);

    // Le tampon lui-même (solde + base de données) est déjà enregistré à ce
    // stade. La notification est un bonus : si Google refuse (ex : quota de
    // 3 notifications/24h dépassé pour cette carte), on ne fait pas
    // échouer tout l'ajout de tampon pour autant — le commerçant voit
    // quand même la confirmation.
    let notificationSent = true;
    try {
      await sendWalletMessage(
        objectId,
        rewardReached ? "Récompense débloquée !" : "+1 tampon !",
        rewardReached
          ? `Bravo, ${rewardLabel} est disponible — montrez cette carte en caisse.`
          : `Plus que ${remaining} tampon(s) avant : ${rewardLabel}.`
      );
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
