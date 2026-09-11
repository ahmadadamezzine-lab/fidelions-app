// pages/api/manage-client.js
//
// Gestion d'une fiche client depuis /commercant : renommer (corrige une
// faute ou un prénom de test), bloquer/débloquer (grisé, exclu des stats
// et campagnes mais gardé pour trace), ou supprimer définitivement.
// Réservé au patron (owner) — un caissier ne doit pas pouvoir modifier ou
// effacer la base de clients.

import { getClient, renameClient, setClientBlocked, deleteClient } from "../../lib/db";
import { renameLoyaltyObject } from "../../lib/walletObjects";
import { getRole, getMerchantId } from "../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }
  const role = getRole(req);
  if (role !== "owner") {
    return res.status(401).json({ error: "Réservé au compte principal du commerce." });
  }
  const merchantId = getMerchantId(req);

  try {
    const { objectId, action, value } = req.body || {};
    if (!objectId || !action) {
      return res.status(400).json({ error: "Requête incomplète." });
    }

    const existing = await getClient(merchantId, objectId);
    if (!existing) {
      return res.status(404).json({ error: "Client introuvable." });
    }

    if (action === "rename") {
      const newName = (value || "").trim();
      if (!newName) {
        return res.status(400).json({ error: "Le nouveau prénom ne peut pas être vide." });
      }
      if (newName.length > 40) {
        return res.status(400).json({ error: "Le prénom est trop long (40 caractères max)." });
      }
      const updated = await renameClient(merchantId, objectId, newName);
      // Renomme aussi la carte Wallet elle-même — pas grave si ça échoue
      // (le renommage en base reste valable, c'est juste un bonus visuel).
      try {
        await renameLoyaltyObject(objectId, newName);
      } catch (err) {
        console.error("Renommage Wallet non appliqué :", err);
      }
      return res.status(200).json({ client: updated });
    }

    if (action === "block" || action === "unblock") {
      const updated = await setClientBlocked(merchantId, objectId, action === "block");
      return res.status(200).json({ client: updated });
    }

    if (action === "delete") {
      await deleteClient(merchantId, objectId);
      return res.status(200).json({ deleted: true });
    }

    return res.status(400).json({ error: "Action inconnue." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
