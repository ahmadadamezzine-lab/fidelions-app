// pages/api/employee-auth.js
//
// Appelé une seule fois par /scan/[token] quand un employé tape son code à
// 4 chiffres : vérifie le lien (token) ET le code, puis renvoie son prénom
// et ses permissions par rubrique. La page garde ensuite {token, pin} pour
// les appels suivants (add-stamp, scan-lookup, clients, stats, broadcast),
// exactement comme getRoleAsync (lib/auth.js) les revérifie à chaque fois —
// rien n'est stocké côté serveur au-delà du token/PIN déjà en base.

import { isValidEmployeeToken, findEmployeeByPin } from "../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const { token, pin } = req.body || {};
    if (!token || !(await isValidEmployeeToken(token))) {
      return res.status(401).json({ error: "Lien invalide ou expiré — demande un nouveau lien à ton responsable." });
    }

    const employee = await findEmployeeByPin(pin);
    if (!employee) {
      return res
        .status(401)
        .json({ error: "Code incorrect, ou accès en dehors de tes horaires autorisés." });
    }

    return res.status(200).json({
      employeeId: employee.id,
      name: employee.name,
      permissions: employee.permissions,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
