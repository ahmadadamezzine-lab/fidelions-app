// lib/auth.js
//
// Trois niveaux d'accès :
// - "owner" (MERCHANT_PASSWORD) : accès complet — campagnes, stats, tampons.
// - "cashier" (CASHIER_PASSWORD, optionnel) : juste ajouter des tampons,
//   sans accès aux campagnes ni aux statistiques. Utile pour donner accès
//   à un employé sans lui donner les clés de tout le compte.
// - "scanner" (lien employé à part, voir lib/db.js) : encore plus restreint
//   que "cashier" — uniquement scanner un QR pour ajouter un point, jamais
//   de liste ni de recherche de clients. Pensé pour un lien qu'on peut
//   partager sans risque et régénérer si un employé part.

import { isValidEmployeeToken } from "./db";

export function getRole(req) {
  const provided = (req.headers["x-merchant-password"] || "").trim();
  if (!provided) return null;

  const ownerPw = (process.env.MERCHANT_PASSWORD || "").trim();
  if (ownerPw && provided === ownerPw) return "owner";

  const cashierPw = (process.env.CASHIER_PASSWORD || "").trim();
  if (cashierPw && provided === cashierPw) return "cashier";

  return null;
}

/**
 * Comme getRole, mais vérifie en plus le lien employé (token stocké en
 * base, pas un simple mot de passe d'environnement) si aucun mot de passe
 * classique ne correspond. Asynchrone à cause de l'appel Redis — à utiliser
 * dans les routes API qui doivent accepter ce lien (ex: scan-lookup,
 * add-stamp).
 */
export async function getRoleAsync(req) {
  const syncRole = getRole(req);
  if (syncRole) return syncRole;

  const token = (req.headers["x-employee-token"] || "").trim();
  if (token && (await isValidEmployeeToken(token))) return "scanner";

  return null;
}
