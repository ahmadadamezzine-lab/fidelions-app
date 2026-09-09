// pages/api/scan-lookup.js
//
// Utilisé par le scanner (espace commerçant ET lien employé /scan/[token])
// juste après la lecture d'un QR, pour afficher le prénom et le solde du
// client avant de valider le tampon. Volontairement minimal : seulement
// l'objectId exact scanné, jamais de recherche par nom — c'est ce qui
// distingue ce rôle "scanner" de "cashier"/"owner".

import { getClient } from "../../lib/db";
import { getRoleAsync } from "../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }
  const role = await getRoleAsync(req);
  if (!role) {
    return res.status(401).json({ error: "Accès refusé." });
  }

  try {
    const objectId = (req.query.objectId || "").toString().trim();
    if (!objectId) {
      return res.status(400).json({ error: "Identifiant client manquant." });
    }

    const client = await getClient(objectId);
    if (!client) {
      return res
        .status(404)
        .json({ error: "Client introuvable — ce QR ne correspond à aucune carte Fidélions." });
    }

    return res.status(200).json({
      objectId: client.objectId,
      prenom: client.prenom,
      points: client.points,
      blocked: !!client.blocked,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
