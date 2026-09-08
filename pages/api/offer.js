// pages/api/offer.js
//
// L'"offre" du commerçant : un texte totalement libre, modifiable
// directement depuis /commercant. Peut partir des suggestions de l'IA,
// mais le commerçant écrit/édite ce qu'il veut, comme il veut.

import { getOfferText, saveOfferText } from "../../lib/db";
import { getRole } from "../../lib/auth";

export default async function handler(req, res) {
  const role = getRole(req);
  if (role !== "owner") {
    return res.status(401).json({ error: "Réservé au compte principal du restaurant." });
  }

  if (req.method === "GET") {
    try {
      const offerText = await getOfferText();
      return res.status(200).json({ offerText });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message || "Erreur serveur" });
    }
  }

  if (req.method === "POST") {
    try {
      const { offerText } = req.body || {};
      const saved = await saveOfferText(offerText || "");
      return res.status(200).json({ offerText: saved });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message || "Erreur serveur" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Méthode non autorisée" });
}
