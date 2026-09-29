// pages/api/order-card.js
//
// Reçoit une commande de carte NFC/QR depuis la page publique
// /commander-carte (remplace l'ancien lien "Commander la mienne" qui
// redirigeait directement vers WhatsApp). Enregistre la commande
// (retrouvable dans /admin-cartes) puis envoie un email de notification à
// Adam — pas de paiement pris ici, juste la prise de commande ; le
// paiement/suivi se fait ensuite manuellement, comme annoncé sur la page.

import { saveCardOrder, checkRateLimit } from "../../lib/db";
import { getClientIp } from "../../lib/auth";
import { sendEmail } from "../../lib/email";

const ADAM_EMAIL = "ahmadadamezzine@gmail.com";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const ip = getClientIp(req);
  const withinLimit = await checkRateLimit(`order-card:${ip}`, 5, 3600).catch(() => true);
  if (!withinLimit) {
    return res.status(429).json({ error: "Trop de tentatives, réessaie plus tard." });
  }

  const { restaurantName, contactName, email, phone, address, quantity } = req.body || {};
  if (!String(restaurantName || "").trim() || !String(contactName || "").trim()) {
    return res.status(400).json({ error: "Nom du commerce et nom de contact requis." });
  }
  if (!String(email || "").includes("@")) {
    return res.status(400).json({ error: "Email invalide." });
  }
  if (!String(address || "").trim()) {
    return res.status(400).json({ error: "Adresse de livraison requise." });
  }

  try {
    const order = await saveCardOrder({ restaurantName, contactName, email, phone, address, quantity });

    await sendEmail({
      to: ADAM_EMAIL,
      subject: `Nouvelle commande de carte — ${order.restaurantName}`,
      text:
        `${order.restaurantName} (${order.contactName}) commande ${order.quantity} carte(s) NFC/QR.\n\n` +
        `Email : ${order.email}\n` +
        `Téléphone : ${order.phone || "—"}\n` +
        `Adresse de livraison : ${order.address}\n\n` +
        `Voir/traiter dans /admin-cartes.`,
    }).catch((err) => console.error("order-card: email non envoyé", err));

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("order-card:", err);
    return res.status(500).json({ error: "Erreur serveur, réessaie dans un instant." });
  }
}
