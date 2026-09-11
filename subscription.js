// pages/api/subscription.js
//
// Formule tarifaire choisie à l'inscription (palier de points de vente +
// cycle de facturation, voir lib/db.js/getSubscriptionChoice) — affichée
// dans l'onglet Abonnement. Réservé au compte principal.

import { getSubscriptionChoice } from "../../lib/db";
import { getRole, getMerchantId } from "../../lib/auth";

export default async function handler(req, res) {
  const role = getRole(req);
  if (role !== "owner") {
    return res.status(401).json({ error: "Réservé au compte principal du commerce." });
  }
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }
  const merchantId = getMerchantId(req);
  try {
    const subscription = await getSubscriptionChoice(merchantId);
    return res.status(200).json(subscription);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
