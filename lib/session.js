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

// ---------------------------------------------------------------------
// Session "admin cartes" (voir pages/admin-cartes.js) : un jeton séparé,
// signé avec le même secret que les sessions commerçant (pas besoin d'une
// 2e variable d'environnement), mais avec une forme différente
// ({ admin: true }, sans merchantId) pour qu'un jeton commerçant ne puisse
// jamais être réutilisé ici par erreur, et inversement.
// ---------------------------------------------------------------------

const ADMIN_SESSION_DURATION = "12h";

export function signAdminSession() {
  return jwt.sign({ admin: true }, getSecret(), { algorithm: "HS256", expiresIn: ADMIN_SESSION_DURATION });
}

export function verifyAdminSession(token) {
  if (!token) return false;
  try {
    const payload = jwt.verify(token, getSecret(), { algorithms: ["HS256"] });
    return !!(payload && payload.admin === true);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------
// Cookie de session httpOnly (owner) — remplace le stockage du jeton dans
// localStorage côté navigateur (voir pages/commercant.js). Un jeton dans
// localStorage est lisible par n'importe quel script qui tourne sur la
// page (une faille XSS, une extension de navigateur malveillante, etc.)
// et reste sur le disque même après fermeture de l'onglet — un cookie
// httpOnly, lui, n'est JAMAIS accessible en JavaScript (ni en lecture ni
// en écriture) : seul le navigateur le lit pour l'attacher automatiquement
// aux requêtes vers fidelions-app.vercel.app. C'est le point "jeton de
// connexion volable" que corrige cette fonction.
//
// `Secure` restreint le cookie à HTTPS (Vercel sert tout en HTTPS, donc
// aucun impact) ; `SameSite=Lax` empêche un autre site de faire porter ce
// cookie par le navigateur d'un visiteur (protection CSRF de base) tout en
// laissant fonctionner la redirection Google OAuth (qui revient depuis un
// domaine externe puis navigue vers fidelions-app.vercel.app — SameSite=Lax
// autorise cette navigation de premier niveau, contrairement à `Strict`).
export const SESSION_COOKIE_NAME = "fidelions_session";
const SESSION_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 jours, en secondes

export function buildSessionCookie(token) {
  return `${SESSION_COOKIE_NAME}=${token}; Max-Age=${SESSION_COOKIE_MAX_AGE}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export function buildLogoutCookie() {
  return `${SESSION_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`;
}
