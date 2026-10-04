// pages/api/locations.js
//
// Points de vente d'un compte (multi-établissement) — voir lib/db.js,
// section "Points de vente", pour le détail du modèle de données.
//
// GET          -> liste des points de vente (patron ET employé, pour
//                 pouvoir choisir où il scanne — lecture seule)
// POST         -> ajoute un point de vente (patron uniquement)
// PATCH {id}   -> renomme / modifie l'adresse d'un point de vente (patron)
// DELETE {id}  -> supprime un point de vente (patron, jamais le dernier)

import { getRoleAsync } from "../../lib/auth";
import { listLocations, ensureDefaultLocation, addLocation, updateLocation, removeLocation, getMerchantById } from "../../lib/db";

export default async function handler(req, res) {
  const auth = await getRoleAsync(req);
  if (!auth) {
    return res.status(401).json({ error: "Accès refusé." });
  }

  try {
    if (req.method === "GET") {
      const merchant = await getMerchantById(auth.merchantId);
      const locations = await ensureDefaultLocation(auth.merchantId, merchant?.restaurantName);
      return res.status(200).json({ locations });
    }

    if (auth.role !== "owner") {
      return res.status(403).json({ error: "Réservé au compte principal du commerce." });
    }

    if (req.method === "POST") {
      const { name, address } = req.body || {};
      const location = await addLocation(auth.merchantId, { name, address });
      return res.status(200).json({ location });
    }

    if (req.method === "PATCH") {
      const { id, name, address } = req.body || {};
      if (!id) return res.status(400).json({ error: "Point de vente manquant." });
      const location = await updateLocation(auth.merchantId, id, { name, address });
      return res.status(200).json({ location });
    }

    if (req.method === "DELETE") {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: "Point de vente manquant." });
      await removeLocation(auth.merchantId, id);
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", ["GET", "POST", "PATCH", "DELETE"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  } catch (err) {
    return res.status(400).json({ error: err.message || "Erreur serveur" });
  }
}
