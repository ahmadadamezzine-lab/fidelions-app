// lib/session.js
//
// Depuis le passage aux comptes commerçants (un seul site Fidélions,
// chaque restaurant crée son propre compte), on ne compare plus un mot de
// passe partagé à une variable d'environnement : on signe un jeton de
// session (JWT) au moment de la connexion, et on le revérifie à chaque
// appel API. Centralisé ici pour que lib/auth.js et les routes
// auth-signup/auth-login n'aient chacune à réinventer la logique de
// signature/vérification.
//
// Le jeton ne contient qu'un identifiant de commerçant (merchantId) — pas
// de mot de passe, pas de donnée sensible — et expire au bout de 30 jours
// (le commerçant doit alors juste se reconnecter, comme sur n'importe quel
// site).

import jwt from "jsonwebtoken";

const SESSION_DURATION = "30d";

function getSecret() {
  const secret = (process.env.SESSION_SECRET || "").trim();
  if (!secret) {
    throw new Error(
      "Variable d'environnement manquante : SESSION_SECRET (une longue chaîne aléatoire à définir une seule fois dans Vercel — voir le message de déploiement pour la valeur à utiliser)."
    );
  }
  return secret;
}

/** Signe un nouveau jeton de session pour ce commerçant, valable 30 jours. */
export function signSession({ merchantId }) {
  if (!merchantId) {
    throw new Error("signSession: merchantId manquant.");
  }
  return jwt.sign({ merchantId }, getSecret(), { algorithm: "HS256", expiresIn: SESSION_DURATION });
}

/**
 * Vérifie un jeton de session. Renvoie { merchantId } s'il est valide,
 * ou null s'il est absent, expiré, ou invalide (jamais d'exception laissée
 * remonter — un jeton invalide doit juste être traité comme "pas connecté").
 */
export function verifySession(token) {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, getSecret(), { algorithms: ["HS256"] });
    if (!payload || !payload.merchantId) return null;
    return { merchantId: payload.merchantId };
  } catch {
    return null;
  }
}
