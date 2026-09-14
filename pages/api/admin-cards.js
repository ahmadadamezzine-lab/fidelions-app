// pages/api/admin-cards.js
//
// API de gestion des cartes NFC/QR physiques, réservée à /admin-cartes
// (jeton "admin", voir lib/session.js — jamais un jeton commerçant, même
// valide, n'est accepté ici, et inversement).
//
// GET            -> liste toutes les cartes déjà générées
// POST {quantity}-> génère un nouveau lot de codes (à donner à l'imprimeur)
// PATCH {code, merchantSlug} -> relie une carte à un commerçant (vente)
// PATCH {code, merchantSlug: null} -> libère une carte

import { verifyAdminSession } from "../../lib/session";
import { createCardBatch, listCards, assignCard, unassignCard } from "../../lib/db";

function checkAdmin(req, res) {
  const token = (req.headers["x-admin-password"] || "").trim();
  if (!verifyAdminSession(token)) {
    res.status(401).json({ error: "Session admin invalide ou expirée, reconnecte-toi." });
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  if (!checkAdmin(req, res)) return;

  try {
    if (req.method === "GET") {
      const cards = await listCards();
      return res.status(200).json({ cards });
    }

    if (req.method === "POST") {
      const { quantity } = req.body || {};
      const proto = req.headers["x-forwarded-proto"] || "https";
      const baseUrl = `${proto}://${req.headers.host}`;
      const created = await createCardBatch(quantity, { baseUrl });
      return res.status(200).json({ created });
    }

    if (req.method === "PATCH") {
      const { code, merchantSlug } = req.body || {};
      if (!code) return res.status(400).json({ error: "Code de carte manquant." });
      const card = merchantSlug ? await assignCard(code, merchantSlug) : await unassignCard(code);
      return res.status(200).json({ card });
    }

    res.setHeader("Allow", ["GET", "POST", "PATCH"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ error: err.message || "Erreur serveur" });
  }
}
