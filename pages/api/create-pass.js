// pages/api/create-pass.js
//
// Endpoint appelé par la page d'inscription quand le client clique sur
// "Ajouter à Google Wallet". Reçoit un prénom, renvoie l'URL du pass.

import { v4 as uuidv4 } from "uuid";
import { buildSaveToWalletUrl } from "../../lib/wallet";

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const { prenom } = req.body || {};
    const objectSuffix = `client_${uuidv4().replace(/-/g, "")}`;
    const url = buildSaveToWalletUrl({
      objectSuffix,
      accountName: (prenom || "").trim() || "Client Fidélions",
    });
    return res.status(200).json({ url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
