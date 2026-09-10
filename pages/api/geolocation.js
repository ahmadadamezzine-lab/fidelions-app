// pages/api/geolocation.js
//
// Notifications de proximité : le commerçant tape juste son adresse (avec
// autocomplétion via l'API Adresse du gouvernement français), on la géocode
// (lib/geocode.js, api-adresse.data.gouv.fr — gratuit, sans clé) puis on
// l'envoie à Google Wallet (lib/walletObjects.js, patchLoyaltyClassLocations)
// qui se charge lui-même d'avertir le téléphone d'un client équipé quand il
// passe à proximité — aucun code de géolocalisation côté client. Le message
// personnalisé (patchLoyaltyClassMessage) est affiché en permanence sur la
// carte, car Google ne permet pas de personnaliser le texte du popup natif
// de proximité via l'API publique. Réservé au patron.

import { getGeoSettings, saveGeoSettings, getMerchantById } from "../../lib/db";
import { geocodeAddress } from "../../lib/geocode";
import { patchLoyaltyClassLocations, patchLoyaltyClassMessage, describeWalletError } from "../../lib/walletObjects";
import { getRole, getMerchantId } from "../../lib/auth";

export default async function handler(req, res) {
  const role = getRole(req);
  if (role !== "owner") {
    return res.status(401).json({ error: "Réservé au compte principal du restaurant." });
  }
  const merchantId = getMerchantId(req);

  if (req.method === "GET") {
    try {
      const geo = await getGeoSettings(merchantId);
      return res.status(200).json(geo);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message || "Erreur serveur" });
    }
  }

  if (req.method === "POST") {
    try {
      const { enabled, address, message } = req.body || {};

      let lat = null;
      let lng = null;
      if (enabled) {
        if (!(address || "").trim()) {
          return res.status(400).json({ error: "Indique l'adresse du restaurant." });
        }
        const found = await geocodeAddress(address);
        if (!found) {
          return res
            .status(400)
            .json({ error: "Adresse introuvable — vérifie l'orthographe ou précise la ville." });
        }
        lat = found.lat;
        lng = found.lng;
      }

      const geo = await saveGeoSettings(merchantId, { enabled, address, lat, lng, message });

      let walletUpdated = true;
      let walletError = null;
      try {
        const merchant = await getMerchantById(merchantId);
        if (!merchant?.walletClassId) {
          throw new Error("Classe Google Wallet introuvable pour ce compte.");
        }
        await patchLoyaltyClassLocations(
          merchant.walletClassId,
          geo.enabled ? [{ lat: geo.lat, lng: geo.lng }] : []
        );
        await patchLoyaltyClassMessage(merchant.walletClassId, geo.message);
      } catch (err) {
        console.error("Localisation/message Wallet non appliqués :", err?.response?.data || err);
        walletUpdated = false;
        walletError = describeWalletError(err);
      }

      return res.status(200).json({ ...geo, walletUpdated, walletError });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message || "Erreur serveur" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Méthode non autorisée" });
}
