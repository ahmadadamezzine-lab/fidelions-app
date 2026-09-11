// pages/api/loyalty-settings.js
//
// Paliers du programme de fidélité (système unique "points", voir
// lib/loyalty.js) : un seul palier défini = carte classique à seuil
// unique, plusieurs paliers = étapes qui se débloquent chacune une fois.
// Réservé au patron — changer ce réglage change l'expérience de tous les
// clients.

import { getLoyaltySettings, updateLoyaltySettings, getMerchantById } from "../../lib/db";
import { patchLoyaltyClassPointsLabel } from "../../lib/walletObjects";
import { getRole, getMerchantId } from "../../lib/auth";

export default async function handler(req, res) {
  const role = getRole(req);
  if (role !== "owner") {
    return res.status(401).json({ error: "Réservé au compte principal du commerce." });
  }
  const merchantId = getMerchantId(req);

  if (req.method === "GET") {
    try {
      const settings = await getLoyaltySettings(merchantId);
      return res.status(200).json(settings);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message || "Erreur serveur" });
    }
  }

  if (req.method === "POST") {
    try {
      const { tiers, mode, pointsConfig } = req.body || {};
      if (!Array.isArray(tiers) || tiers.length === 0) {
        return res.status(400).json({ error: "Ajoute au moins un palier." });
      }
      if (tiers.length > 10) {
        return res.status(400).json({ error: "10 paliers maximum." });
      }
      for (const t of tiers) {
        const threshold = Number(t.threshold);
        if (!Number.isFinite(threshold) || threshold < 1 || threshold > 1000) {
          return res.status(400).json({ error: "Chaque palier doit être entre 1 et 1000." });
        }
        if (!(t.label || "").trim()) {
          return res.status(400).json({ error: "Décris la récompense de chaque palier." });
        }
      }
      if (mode !== undefined && mode !== "stamps" && mode !== "points") {
        return res.status(400).json({ error: "Mécanique de fidélité invalide." });
      }

      const settings = await updateLoyaltySettings(merchantId, { tiers, mode, pointsConfig });

      // Non bloquant : si Google refuse (ex : quota), le réglage reste
      // valable côté Fidélions, seul le libellé affiché sur Wallet ne
      // change pas tout de suite.
      try {
        const merchant = await getMerchantById(merchantId);
        if (!merchant?.walletClassId) {
          throw new Error("Classe Google Wallet introuvable pour ce compte.");
        }
        await patchLoyaltyClassPointsLabel(merchant.walletClassId, "Points");
      } catch (err) {
        console.error("Libellé Wallet non mis à jour :", err);
      }

      return res.status(200).json(settings);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message || "Erreur serveur" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Méthode non autorisée" });
}
