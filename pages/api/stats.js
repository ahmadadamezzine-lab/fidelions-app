// pages/api/stats.js
//
// Alimente la rubrique "Statistiques" de /commercant : tuiles + graphes
// calculés à partir du journal des passages (lib/db.js: getRecentEvents)
// et de la liste des clients. Calculs eux-mêmes dans lib/stats.js (pur,
// testable sans réseau). Accessible au patron, et à tout employé (lien +
// code) dont la permission "stats" a été activée dans l'onglet Équipe.

import { getRecentEvents, listClients } from "../../lib/db";
import {
  pointsParJour,
  heuresDePointe,
  joursDeLaSemaine,
  nouveauxClientsParSemaine,
  statTiles,
  evolutionClientsFidelises,
} from "../../lib/stats";
import { getRoleAsync, hasPermission } from "../../lib/auth";

const EVOLUTION_RANGES = ["jour", "semaine", "mois", "annee", "debut"];

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }
  const auth = await getRoleAsync(req);
  const allowed = auth && (auth.role === "owner" || hasPermission(auth, "stats"));
  if (!allowed) {
    return res.status(401).json({ error: "Accès refusé." });
  }

  // Période choisie pour la courbe "évolution des clients fidélisés" (voir
  // onglet Statistiques) — repli sur "mois" si absent ou invalide.
  const range = EVOLUTION_RANGES.includes(req.query.range) ? req.query.range : "mois";

  try {
    const [events, clients] = await Promise.all([
      getRecentEvents(auth.merchantId),
      listClients(auth.merchantId),
    ]);

    return res.status(200).json({
      tiles: statTiles(events, clients),
      pointsParJour: pointsParJour(events),
      heuresDePointe: heuresDePointe(events),
      joursDeLaSemaine: joursDeLaSemaine(events),
      nouveauxClientsParSemaine: nouveauxClientsParSemaine(clients),
      evolutionClients: evolutionClientsFidelises(clients, range),
      evolutionRange: range,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
