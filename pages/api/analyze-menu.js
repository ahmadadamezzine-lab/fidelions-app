// pages/api/analyze-menu.js
//
// Vraie analyse IA (Google Gemini) du menu envoyé par le commerçant —
// texte collé, PDF ou photo. L'IA comprend le document toute seule et
// renvoie les plats détectés + des suggestions de promotions. Le
// commerçant peut ensuite éditer librement le texte de son offre
// (voir /api/offer) — l'IA ne fait que proposer un point de départ.

import { analyzeMenuWithAI } from "../../lib/ai";
import { getRole } from "../../lib/auth";

// Une photo de menu ou un PDF peut peser plusieurs Mo une fois encodé en
// base64 — la limite par défaut de Next (1 Mo) est trop basse.
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }
  const role = getRole(req);
  if (role !== "owner") {
    return res.status(401).json({ error: "Réservé au compte principal du commerce." });
  }

  try {
    const { text, fileBase64, mimeType } = req.body || {};
    const file = fileBase64 && mimeType ? { base64: fileBase64, mimeType } : null;
    const result = await analyzeMenuWithAI({ text, file });
    return res.status(200).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
