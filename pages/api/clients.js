// pages/api/clients.js
//
// Liste des clients pour l'espace commerçant (recherche manuelle,
// tableau des visites). Protégé par le même mot de passe commerçant.

import { listClients } from "../../lib/db";

function checkAuth(req) {
  const password = (process.env.MERCHANT_PASSWORD || "").trim();
  const provided = (req.headers["x-merchant-password"] || "").trim();
  return Boolean(password) && provided === password;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }
  if (!checkAuth(req)) {
    return res.status(401).json({ error: "Mot de passe commerçant incorrect." });
  }

  try {
    const clients = await listClients();
    return res.status(200).json({ clients });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
