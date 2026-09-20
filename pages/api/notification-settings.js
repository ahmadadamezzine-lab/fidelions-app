// pages/api/notification-settings.js
//
// Réglages de l'onglet Notifications > "Automatisations" (demande d'avis
// Google après un passage, relance client inactif) — voir lib/db.js pour
// les valeurs par défaut et lib/notifications.js pour la logique de
// déclenchement. Réservé au patron, comme les autres onglets de réglages
// (voir pages/api/geolocation.js pour le même schéma GET/POST).

import { getNotificationSettings, saveNotificationSettings } from "../../lib/db";
import { getRole, getMerchantId } from "../../lib/auth";

export default async function handler(req, res) {
  const role = getRole(req);
  if (role !== "owner") {
    return res.status(401).json({ error: "Réservé au compte principal du commerce." });
  }
  const merchantId = getMerchantId(req);

  if (req.method === "GET") {
    try {
      const settings = await getNotificationSettings(merchantId);
      return res.status(200).json(settings);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message || "Erreur serveur" });
    }
  }

  if (req.method === "POST") {
    try {
      const settings = await saveNotificationSettings(merchantId, req.body || {});
      return res.status(200).json(settings);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message || "Erreur serveur" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Méthode non autorisée" });
}
