// pages/api/geolocation.js
//
// Notifications de proximité : le commerçant tape juste son adresse, on la
// géocode (lib/geocode.js, Nominatim/OpenStreetMap — gratuit) puis on
// l'envoie à Google Wallet (lib/walletObjects.js, patchLoyaltyClassLocations)
// qui se charge lui-même d'avertir le téléphone d'un client équipé quand il
// passe à proximité — aucun code de géolocalisation côté client. Réservé
// au patron.

import { getGeoSettings, saveGeoSettings } from "../../lib/db";
import { geocodeAddress } from "../../lib/geocode";
import { patchLoyaltyClassLocations } from "../../lib/walletObjects";
import { getRole } from "../../lib/auth";

export default async function handler(req, res) {
  const role = getRole(req);
  if (role !== "owner") {
    return res.status(401).json({ error: "Réservé au compte principal du restaurant." });
  }

  if (req.method === "GET") {
    try {
      const geo = await getGeoSettings();
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

      const geo = await saveGeoSettings({ enabled, address, lat, lng, message });

      let walletUpdated = true;
      try {
        await patchLoyaltyClassLocations(geo.enabled ? [{ lat: geo.lat, lng: geo.lng }] : []);
      } catch (err) {
        console.error("Localisation Wallet non appliquée :", err);
        walletUpdated = false;
      }

      return res.status(200).json({ ...geo, walletUpdated });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message || "Erreur serveur" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Méthode non autorisée" });
}
