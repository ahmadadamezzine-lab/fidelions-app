// pages/api/migrate-demo.js
//
// Endpoint à USAGE UNIQUE, à appeler une seule fois juste après le
// déploiement de la version multi-comptes : convertit les données qui
// existaient déjà avant (clients, réglages, équipe, personnalisation —
// tout ce qui était stocké sous l'ancien système mono-restaurant) en un
// vrai premier compte commerçant, sans rien perdre. Il refuse de toute
// façon de s'exécuter une deuxième fois (voir migrateLegacyDemoAccount).
//
// Pas de compte pour se connecter normalement à ce stade — protégé par
// SESSION_SECRET, passé en paramètre ?secret=.
//
// Appel (depuis un navigateur, en remplaçant les valeurs) :
//   /api/migrate-demo?secret=TA_VALEUR_SESSION_SECRET&restaurantName=Le%20Nom%20De%20Ton%20Restaurant&password=UnMotDePasseDau8Caracteres

import { migrateLegacyDemoAccount } from "../../lib/db";
import { signSession } from "../../lib/session";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const secret = (process.env.SESSION_SECRET || "").trim();
  if (!secret || req.query.secret !== secret) {
    return res.status(401).json({ error: "Accès refusé." });
  }

  const email = String(req.query.email || "").trim() || "ahmadadamezzine@gmail.com";
  const restaurantName = String(req.query.restaurantName || "").trim();
  const password = String(req.query.password || "").trim();
  const walletClassId = (process.env.GOOGLE_WALLET_CLASS_ID || "").trim();

  if (!restaurantName) {
    return res.status(400).json({ error: "Paramètre restaurantName manquant (le nom de ton commerce)." });
  }
  if (!password) {
    return res.status(400).json({ error: "Paramètre password manquant (choisis un mot de passe d'au moins 8 caractères)." });
  }
  if (!walletClassId) {
    return res
      .status(500)
      .json({ error: "Variable d'environnement GOOGLE_WALLET_CLASS_ID manquante (elle devrait déjà être configurée sur Vercel)." });
  }

  try {
    const merchant = await migrateLegacyDemoAccount({ email, password, restaurantName, walletClassId });
    const token = signSession({ merchantId: merchant.id });
    return res.status(200).json({
      ok: true,
      message: "Migration réussie. Connecte-toi maintenant sur /commercant avec cet email et ce mot de passe.",
      email: merchant.email,
      slug: merchant.slug,
      signupLinkForClients: `/r/${merchant.slug}`,
      token,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
