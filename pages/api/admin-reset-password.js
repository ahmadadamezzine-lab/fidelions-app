// pages/api/admin-reset-password.js
//
// Dépannage à usage exceptionnel : réinitialise le mot de passe d'un
// compte commerçant SANS connaître l'ancien — pour le cas où le mot de
// passe est perdu et où /commercant (qui exige toujours l'ancien mot de
// passe, voir /api/change-password) ne suffit plus. Protégé par
// SESSION_SECRET, même principe que /api/migrate-demo.
//
// Appel (depuis un navigateur, en remplaçant les valeurs) :
//   /api/admin-reset-password?secret=TA_VALEUR_SESSION_SECRET&email=ahmadadamezzine@gmail.com&newPassword=UnNouveauMotDePasse

import { adminSetMerchantPassword } from "../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const secret = (process.env.SESSION_SECRET || "").trim();
  if (!secret || req.query.secret !== secret) {
    return res.status(401).json({ error: "Accès refusé." });
  }

  const email = String(req.query.email || "").trim();
  const newPassword = String(req.query.newPassword || "").trim();

  if (!email) {
    return res.status(400).json({ error: "Paramètre email manquant." });
  }
  if (!newPassword) {
    return res.status(400).json({ error: "Paramètre newPassword manquant (choisis un mot de passe d'au moins 4 caractères)." });
  }

  try {
    const merchant = await adminSetMerchantPassword(email, newPassword);
    return res.status(200).json({
      ok: true,
      message: "Mot de passe réinitialisé. Connecte-toi maintenant sur /commercant avec cet email et ce nouveau mot de passe.",
      email: merchant.email,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
