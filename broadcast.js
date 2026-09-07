// pages/api/broadcast.js
//
// Envoie une notification à TOUS les clients d'un coup (une "campagne"),
// affichée directement dans leur Google Wallet. C'est l'équivalent de la
// fonction "notification push à tous les clients" montrée dans la vidéo
// Fidelix — utile pour annoncer une promo, un nouveau plat, un événement…

import { listClients } from "../../lib/db";
import { sendWalletMessage } from "../../lib/walletObjects";

function checkAuth(req) {
  const password = (process.env.MERCHANT_PASSWORD || "").trim();
  const provided = (req.headers["x-merchant-password"] || "").trim();
  return Boolean(password) && provided === password;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }
  if (!checkAuth(req)) {
    return res.status(401).json({ error: "Mot de passe commerçant incorrect." });
  }

  try {
    const { header, body } = req.body || {};
    const cleanHeader = (header || "").trim();
    const cleanBody = (body || "").trim();
    if (!cleanHeader || !cleanBody) {
      return res.status(400).json({ error: "Le titre et le message sont obligatoires." });
    }
    if (cleanHeader.length > 60) {
      return res.status(400).json({ error: "Le titre est trop long (60 caractères max)." });
    }
    if (cleanBody.length > 300) {
      return res.status(400).json({ error: "Le message est trop long (300 caractères max)." });
    }

    const clients = await listClients();
    if (clients.length === 0) {
      return res.status(400).json({ error: "Aucun client à qui envoyer la campagne pour le moment." });
    }

    // On envoie par petits groupes pour ne pas saturer l'API Google d'un
    // coup si la base de clients grossit un jour.
    const CHUNK_SIZE = 8;
    let sent = 0;
    let failed = 0;
    for (let i = 0; i < clients.length; i += CHUNK_SIZE) {
      const chunk = clients.slice(i, i + CHUNK_SIZE);
      const results = await Promise.allSettled(
        chunk.map((c) => sendWalletMessage(c.objectId, cleanHeader, cleanBody))
      );
      for (const r of results) {
        if (r.status === "fulfilled") sent++;
        else failed++;
      }
    }

    return res.status(200).json({ sent, failed, total: clients.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
