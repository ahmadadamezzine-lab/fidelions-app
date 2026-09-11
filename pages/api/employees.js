// pages/api/employees.js
//
// Gestion de l'équipe par le patron : liste, création/modification
// (upsert), suppression. Le patron authentifié reste seul à pouvoir lire
// ces codes (le point commun de toute cette route est le contrôle de rôle
// ci-dessous) ; côté écran, /commercant les affiche masqués par défaut
// avec un bouton "afficher" (comme sur les captures que tu as envoyées),
// mais ce n'est qu'un confort visuel anti-regard-par-dessus-l'épaule, pas
// une restriction de l'API elle-même.

import { getEmployees, upsertEmployee, deleteEmployee, getEmployeeLeaderboard } from "../../lib/db";
import { getRole, getMerchantId } from "../../lib/auth";

export default async function handler(req, res) {
  const role = getRole(req);
  if (role !== "owner") {
    return res.status(401).json({ error: "Réservé au compte principal du commerce." });
  }
  const merchantId = getMerchantId(req);

  if (req.method === "GET") {
    try {
      const employees = await getEmployees(merchantId);
      // Classement (clients fidélisés + avis obtenus) calculé à chaque
      // chargement de l'onglet Équipe — voir getEmployeeLeaderboard.
      const leaderboard = await getEmployeeLeaderboard(merchantId);
      return res.status(200).json({ employees, leaderboard });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message || "Erreur serveur" });
    }
  }

  if (req.method === "POST") {
    try {
      const { id, name, pin, active, days, startTime, endTime, permissions, action } = req.body || {};

      if (action === "delete") {
        if (!id) return res.status(400).json({ error: "Identifiant manquant." });
        const employees = await deleteEmployee(merchantId, id);
        return res.status(200).json({ employees });
      }

      if (!(name || "").trim()) {
        return res.status(400).json({ error: "Le prénom de l'employé est obligatoire." });
      }
      if (!id && !/^[0-9]{4}$/.test(pin || "")) {
        return res.status(400).json({ error: "Le code doit faire exactement 4 chiffres." });
      }
      if (pin && !/^[0-9]{4}$/.test(pin)) {
        return res.status(400).json({ error: "Le code doit faire exactement 4 chiffres." });
      }
      if (startTime && endTime && startTime >= endTime) {
        return res.status(400).json({ error: "L'heure de fin doit être après l'heure de début." });
      }
      if (pin) {
        // Deux employés avec le même code créeraient une ambiguïté à la
        // connexion (le premier trouvé dans la liste serait authentifié à
        // la place de l'autre, avec son nom et ses permissions) — un code
        // doit donc être unique dans l'équipe.
        const existingEmployees = await getEmployees(merchantId);
        const clash = existingEmployees.find((e) => e.pin === pin && e.id !== id);
        if (clash) {
          return res.status(400).json({ error: `Ce code est déjà utilisé par ${clash.name}. Choisis un autre code à 4 chiffres.` });
        }
      }

      const employee = await upsertEmployee(merchantId, { id, name, pin, active, days, startTime, endTime, permissions });
      const employees = await getEmployees(merchantId);
      return res.status(200).json({ employee, employees });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message || "Erreur serveur" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Méthode non autorisée" });
}
