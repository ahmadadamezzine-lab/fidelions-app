// pages/api/push-subscribe.js
//
// Appelé depuis la page carte publique (/r/[slug], SANS authentification —
// même situation que /api/create-pass) quand un client clique "Activer les
// notifications" : enregistre son abonnement Web Push (norme du navigateur,
// pas Wallet) pour qu'on puisse ensuite lui pousser une vraie notification
// (voir lib/webpush.js) depuis /api/add-stamp.js et /api/broadcast.js.

import { getMerchantBySlug, saveClientPushSubscription, checkRateLimit } from "../../lib/db";
import { isPushConfigured } from "../../lib/webpush";
import { getClientIp } from "../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  if (!isPushConfigured()) {
    return res.status(501).json({ error: "Les notifications push ne sont pas configurées sur ce serveur." });
  }

  // Même protection anti-abus que /api/create-pass : endpoint public, sans
  // authentification.
  const ip = getClientIp(req);
  const withinLimit = await checkRateLimit(`push-subscribe:${ip}`, 20, 60).catch(() => true);
  if (!withinLimit) {
    return res.status(429).json({ error: "Trop de tentatives — réessaie dans une minute." });
  }

  try {
    const { slug, objectId, subscription } = req.body || {};
    if (!slug || !objectId || !subscription?.endpoint) {
      return res.status(400).json({ error: "Requête invalide." });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return res.status(404).json({ error: "Commerce introuvable." });
    }

    const updated = await saveClientPushSubscription(merchant.id, objectId, subscription);
    if (!updated) {
      return res.status(404).json({ error: "Client introuvable." });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
