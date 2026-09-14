// pages/api/admin-cards-login.js
//
// Porte d'entrée de /admin-cartes (outil interne pour Adam uniquement —
// aucun commerçant n'y a accès). Un seul mot de passe, défini dans la
// variable d'environnement CARDS_ADMIN_PASSWORD (voir README), comparé
// ici puis échangé contre un jeton signé (voir signAdminSession dans
// lib/session.js) que le navigateur garde ensuite en mémoire pour le
// reste de la session — pas besoin de retaper le mot de passe à chaque
// action.

import { signAdminSession } from "../../lib/session";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const expected = (process.env.CARDS_ADMIN_PASSWORD || "").trim();
  if (!expected) {
    return res.status(500).json({
      error:
        "Variable d'environnement manquante : CARDS_ADMIN_PASSWORD (à définir une seule fois dans Vercel — voir le README).",
    });
  }

  const { password } = req.body || {};
  if ((password || "").trim() !== expected) {
    return res.status(401).json({ error: "Mot de passe incorrect." });
  }

  return res.status(200).json({ token: signAdminSession() });
}
