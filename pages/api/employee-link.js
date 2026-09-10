// pages/api/employee-link.js
//
// Le lien "employé" (/scan/[token]) donne un accès volontairement très
// restreint : scanner un QR pour ajouter un point, rien d'autre —
// pas de liste de clients, pas de recherche, pas de campagnes. Réservé au
// patron : lui seul peut voir/régénérer ce lien.

import { getEmployeeLinkToken, regenerateEmployeeLinkToken } from "../../lib/db";
import { getRole, getMerchantId } from "../../lib/auth";

export default async function handler(req, res) {
  const role = getRole(req);
  if (role !== "owner") {
    return res.status(401).json({ error: "Réservé au compte principal du restaurant." });
  }
  const merchantId = getMerchantId(req);

  if (req.method === "GET") {
    try {
      const token = await getEmployeeLinkToken(merchantId);
      return res.status(200).json({ token });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message || "Erreur serveur" });
    }
  }

  if (req.method === "POST") {
    // Régénère le lien — l'ancien arrête de fonctionner immédiatement
    // (utile si un employé quitte le restaurant).
    try {
      const token = await regenerateEmployeeLinkToken(merchantId);
      return res.status(200).json({ token });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message || "Erreur serveur" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Méthode non autorisée" });
}
