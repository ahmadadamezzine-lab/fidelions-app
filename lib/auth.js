// lib/auth.js
//
// Niveaux d'accès :
// - "owner" (MERCHANT_PASSWORD) : accès complet — campagnes, stats, tampons.
// - "cashier" (CASHIER_PASSWORD, optionnel) : un 2e mot de passe classique,
//   conservé tel quel pour compatibilité.
// - "employee" (lien partagé /scan/[token] + code à 4 chiffres personnel,
//   voir lib/db.js) : chaque employé a ses propres permissions par
//   rubrique (scan toujours autorisé, clients/stats/campagnes au choix du
//   patron), et un accès qui se coupe tout seul en dehors de ses jours/
//   horaires autorisés. Le lien est commun à l'équipe ; c'est le code qui
//   identifie qui l'utilise et ce qu'il peut faire.

import { isValidEmployeeToken, findEmployeeByPin } from "./db";

const FULL_PERMISSIONS = { scan: true, clients: true, stats: true, campagnes: true };

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
 * Comme getRole, mais reconnaît en plus le lien employé : le token du lien
 * (x-employee-token) ET le code personnel à 4 chiffres de l'employé
 * (x-employee-pin) doivent tous les deux être valides. Renvoie un objet
 * {role, permissions, employeeId?, employeeName?} plutôt qu'une simple
 * chaîne, pour porter les permissions par rubrique jusqu'aux routes API.
 * Asynchrone à cause des appels Redis.
 */
export async function getRoleAsync(req) {
  const syncRole = getRole(req);
  if (syncRole) return { role: syncRole, permissions: FULL_PERMISSIONS };

  const token = (req.headers["x-employee-token"] || "").trim();
  if (!token || !(await isValidEmployeeToken(token))) return null;

  const pin = (req.headers["x-employee-pin"] || "").trim();
  const employee = await findEmployeeByPin(pin);
  if (!employee) return null;

  return {
    role: "employee",
    employeeId: employee.id,
    employeeName: employee.name,
    permissions: employee.permissions,
  };
}

/** Petit utilitaire pour éviter de relire `auth.permissions.xxx` partout. */
export function hasPermission(auth, permission) {
  return !!(auth && auth.permissions && auth.permissions[permission]);
}
