// pages/api/menu.js
//
// Sauvegarde le menu du restaurant (collé ou écrit une fois par le
// commerçant) pour qu'il soit toujours là au prochain login, sur
// n'importe quel appareil. L'analyse et les suggestions de promotions se
// font côté frontend (lib/menuAnalysis, pas d'IA payante ici).

import { getMenuText, saveMenuText } from "../../lib/db";
import { getRole } from "../../lib/auth";

export default async function handler(req, res) {
  const role = getRole(req);
  if (role !== "owner") {
    return res.status(401).json({ error: "Réservé au compte principal du restaurant." });
  }

  if (req.method === "GET") {
    try {
      const menuText = await getMenuText();
      return res.status(200).json({ menuText });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message || "Erreur serveur" });
    }
  }

  if (req.method === "POST") {
    try {
      const { menuText } = req.body || {};
      if (!menuText || !menuText.trim()) {
        return res.status(400).json({ error: "Le menu est vide." });
      }
      const saved = await saveMenuText(menuText);
      return res.status(200).json({ menuText: saved });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message || "Erreur serveur" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Méthode non autorisée" });
}
