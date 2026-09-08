// lib/auth.js
//
// Deux niveaux d'accès à l'espace commerçant :
// - "owner" (MERCHANT_PASSWORD) : accès complet — campagnes, stats, tampons.
// - "cashier" (CASHIER_PASSWORD, optionnel) : juste ajouter des tampons,
//   sans accès aux campagnes ni aux statistiques. Utile pour donner accès
//   à un employé sans lui donner les clés de tout le compte.

export function getRole(req) {
  const provided = (req.headers["x-merchant-password"] || "").trim();
  if (!provided) return null;

  const ownerPw = (process.env.MERCHANT_PASSWORD || "").trim();
  if (ownerPw && provided === ownerPw) return "owner";

  const cashierPw = (process.env.CASHIER_PASSWORD || "").trim();
  if (cashierPw && provided === cashierPw) return "cashier";

  return null;
}
