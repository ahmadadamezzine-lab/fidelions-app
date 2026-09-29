// pages/api/link-card.js
//
// Permet à un commerçant connecté de relier lui-même une carte NFC/QR
// reçue par la poste, depuis son propre espace (onglet Partager) — sans
// passer par Adam. Le code est celui gravé/imprimé sous la carte (voir
// lib/db.js, createCardBatch). Réservé au compte principal ("owner") :
// c'est une action irréversible pour l'ancien titulaire éventuel de la
// carte, donc pas ouverte aux employés.

import { getRole, getMerchantId } from "../../lib/auth";
import { linkCardToMerchant } from "../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }
  if (getRole(req) !== "owner") {
    return res.status(401).json({ error: "Réservé au compte principal du commerce." });
  }
  const merchantId = getMerchantId(req);
  const { code } = req.body || {};
  if (!code) {
    return res.status(400).json({ error: "Code de carte manquant." });
  }

  try {
    const card = await linkCardToMerchant(code, merchantId);
    return res.status(200).json({ card });
  } catch (err) {
    return res.status(400).json({ error: err.message || "Erreur serveur" });
  }
}
