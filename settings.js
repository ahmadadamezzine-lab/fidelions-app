// pages/api/settings.js
//
// Laisse le commerçant régler lui-même le nombre de tampons avant la
// récompense et ce que le client gagne (ex : "1 café offert"), sans
// jamais avoir à toucher au code — exactement ce que fait Fidelix.

import { getSettings, updateSettings } from "../../lib/db";
import { getRole } from "../../lib/auth";

export default async function handler(req, res) {
  // Réglé uniquement par le patron (owner), pas par un caissier.
  const role = getRole(req);
  if (role !== "owner") {
    return res.status(401).json({ error: "Réservé au compte principal du restaurant." });
  }

  if (req.method === "GET") {
    try {
      const settings = await getSettings();
      return res.status(200).json(settings);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message || "Erreur serveur" });
    }
  }

  if (req.method === "POST") {
    try {
      const { rewardThreshold, rewardLabel } = req.body || {};
      const threshold = Number(rewardThreshold);

      if (!Number.isFinite(threshold) || threshold < 1 || threshold > 100) {
        return res.status(400).json({ error: "Le nombre de tampons doit être entre 1 et 100." });
      }
      const cleanLabel = (rewardLabel || "").trim();
      if (!cleanLabel) {
        return res.status(400).json({ error: "Décris la récompense (ex : 1 café offert)." });
      }
      if (cleanLabel.length > 80) {
        return res.status(400).json({ error: "La description de la récompense est trop longue (80 caractères max)." });
      }

      const settings = await updateSettings({ rewardThreshold: threshold, rewardLabel: cleanLabel });
      return res.status(200).json(settings);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message || "Erreur serveur" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Méthode non autorisée" });
}
