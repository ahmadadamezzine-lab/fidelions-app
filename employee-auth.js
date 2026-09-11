// pages/api/employee-auth.js
//
// Appelé une seule fois par /scan/[token] quand un employé tape son code à
// 4 chiffres : vérifie le lien (token) ET le code, puis renvoie son prénom
// et ses permissions par rubrique. La page garde ensuite {token, pin} pour
// les appels suivants (add-stamp, scan-lookup, clients, stats, broadcast),
// exactement comme getRoleAsync (lib/auth.js) les revérifie à chaque fois —
// rien n'est stocké côté serveur au-delà du token/PIN déjà en base.

import { getMerchantIdForEmployeeToken, findEmployeeByPin, getLoyaltySettings } from "../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const { token, pin } = req.body || {};
    const merchantId = token ? await getMerchantIdForEmployeeToken(token) : null;
    if (!merchantId) {
      return res.status(401).json({ error: "Lien invalide ou expiré — demande un nouveau lien à ton responsable." });
    }

    const employee = await findEmployeeByPin(merchantId, pin);
    if (!employee) {
      return res
        .status(401)
        .json({ error: "Code incorrect, ou accès en dehors de tes horaires autorisés." });
    }

    // La mécanique de fidélité (tampons/points) n'est pas une donnée
    // sensible du compte — on la renvoie ici pour que l'écran de scan
    // sache s'il doit demander un montant (voir ScannerSection).
    let loyaltyMode = "stamps";
    let pointsConfig = { pointsPerAmount: 1, amountUnit: 10 };
    try {
      const settings = await getLoyaltySettings(merchantId);
      loyaltyMode = settings.mode;
      pointsConfig = settings.pointsConfig;
    } catch (err) {
      console.error("Mécanique de fidélité non chargée pour l'écran employé :", err);
    }

    return res.status(200).json({
      employeeId: employee.id,
      name: employee.name,
      permissions: employee.permissions,
      loyaltyMode,
      pointsConfig,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
