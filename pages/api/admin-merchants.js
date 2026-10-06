// pages/api/admin-merchants.js
//
// Liste des commerces "à risque" pour /admin-cartes (jeton "admin", voir
// lib/session.js — même garde que pages/api/admin-cards.js). Lecture
// seule : sert juste à savoir qui recontacter avant un désabonnement
// silencieux (voir listMerchantsAtRisk dans lib/db.js).

import { verifyAdminSession } from "../../lib/session";
import { listMerchantsAtRisk } from "../../lib/db";

export default async function handler(req, res) {
  const token = (req.headers["x-admin-password"] || "").trim();
  if (!verifyAdminSession(token)) {
    return res.status(401).json({ error: "Session admin invalide ou expirée, reconnecte-toi." });
  }
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const merchants = await listMerchantsAtRisk();
    return res.status(200).json({ merchants });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
