// lib/auth.js
//
// Niveaux d'accès :
// - "owner" : le compte principal du restaurant, identifié par un jeton de
//   session signé (voir lib/session.js) obtenu à la connexion (email/mot
//   de passe) ou à l'inscription. Le jeton voyage dans le même en-tête
//   qu'avant le passage aux comptes (x-merchant-password) — ça évite de
//   devoir toucher aux dizaines d'appels déjà écrits côté /commercant, qui
//   envoyaient déjà cet en-tête à chaque requête ; ce qu'il transporte a
//   juste changé de nature (un jeton signé au lieu d'un mot de passe fixe).
// - "employee" (lien partagé /scan/[token] + code à 4 chiffres personnel,
//   voir lib/db.js) : chaque employé a ses propres permissions par
//   rubrique (scan toujours autorisé, clients/stats/campagnes au choix du
//   patron), et un accès qui se coupe tout seul en dehors de ses jours/
//   horaires autorisés. Le lien identifie le restaurant ; le code
//   identifie qui l'utilise et ce qu'il peut faire.
//
// Le rôle "cashier" (CASHIER_PASSWORD, un 2e mot de passe global) a été
// retiré avec le passage aux comptes : il n'avait de sens que pour UN
// SEUL restaurant partagé par un mot de passe d'environnement — il n'y a
// plus de "l'" environnement du restaurant, chaque compte est indépendant.
// Le système "employé" (lien + code, permissions fines) fait déjà tout ce
// que "cashier" faisait, en mieux (plusieurs employés distincts, horaires,
// permissions par rubrique) — voir l'onglet Équipe.

import { verifySession, SESSION_COOKIE_NAME } from "./session";
import { getMerchantIdForEmployeeToken, findEmployeeByPin } from "./db";

const FULL_PERMISSIONS = { scan: true, clients: true, stats: true, campagnes: true };

/**
 * Décode le jeton de session. Priorité au cookie httpOnly (jamais lisible
 * en JavaScript côté navigateur — voir buildSessionCookie dans
 * lib/session.js) ; l'en-tête x-merchant-password reste accepté en repli
 * uniquement pour ne pas casser un onglet resté ouvert avec l'ancien
 * frontend pendant les quelques minutes d'un déploiement, mais
 * pages/commercant.js ne l'envoie plus que vide depuis ce correctif.
 */
function decodeOwnerSession(req) {
  const cookieToken = (req.cookies?.[SESSION_COOKIE_NAME] || "").trim();
  if (cookieToken) return verifySession(cookieToken);
  const headerToken = (req.headers["x-merchant-password"] || "").trim();
  if (!headerToken) return null;
  return verifySession(headerToken);
}

/**
 * Renvoie "owner" si l'en-tête porte un jeton de session valide, sinon
 * null. Reste synchrone (la vérification JWT ne fait aucun accès réseau)
 * — pratique pour les routes qui n'ont besoin que du rôle, pas du détail
 * employé (voir getRoleAsync ci-dessous pour ce cas).
 */
export function getRole(req) {
  return decodeOwnerSession(req) ? "owner" : null;
}

/** Renvoie l'identifiant du compte commerçant connecté (owner), ou null. */
export function getMerchantId(req) {
  const session = decodeOwnerSession(req);
  return session ? session.merchantId : null;
}

/**
 * Comme getRole, mais reconnaît en plus le lien employé : le token du lien
 * (x-employee-token) ET le code personnel à 4 chiffres de l'employé
 * (x-employee-pin) doivent tous les deux être valides. Renvoie un objet
 * {role, merchantId, permissions, employeeId?, employeeName?} plutôt
 * qu'une simple chaîne, pour porter le restaurant concerné ET les
 * permissions par rubrique jusqu'aux routes API. Asynchrone à cause des
 * appels Redis (recherche du token, recherche de l'employé).
 */
export async function getRoleAsync(req) {
  const merchantId = getMerchantId(req);
  if (merchantId) return { role: "owner", merchantId, permissions: FULL_PERMISSIONS };

  const token = (req.headers["x-employee-token"] || "").trim();
  if (!token) return null;
  const employeeMerchantId = await getMerchantIdForEmployeeToken(token);
  if (!employeeMerchantId) return null;

  const pin = (req.headers["x-employee-pin"] || "").trim();
  const employee = await findEmployeeByPin(employeeMerchantId, pin);
  if (!employee) return null;

  return {
    role: "employee",
    merchantId: employeeMerchantId,
    employeeId: employee.id,
    employeeName: employee.name,
    permissions: employee.permissions,
  };
}

/** Petit utilitaire pour éviter de relire `auth.permissions.xxx` partout. */
export function hasPermission(auth, permission) {
  return !!(auth && auth.permissions && auth.permissions[permission]);
}

/**
 * Adresse IP du visiteur, pour le rate limiting des endpoints publics
 * (voir checkRateLimit dans lib/db.js) — Vercel transmet la vraie IP
 * client dans x-forwarded-for (le premier maillon de la liste, les
 * suivants étant les proxys intermédiaires). `req.socket.remoteAddress`
 * sert de repli en local (où cet en-tête n'existe pas).
 */
export function getClientIp(req) {
  const forwarded = (req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.socket?.remoteAddress || "unknown";
}
