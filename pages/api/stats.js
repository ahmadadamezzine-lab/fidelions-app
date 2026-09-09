// pages/api/stats.js
//
// Alimente la rubrique "Statistiques" de /commercant : tuiles + graphes
// calculés à partir du journal des passages (lib/db.js: getRecentEvents)
// et de la liste des clients. Calculs eux-mêmes dans lib/stats.js (pur,
// testable sans réseau). Réservé au patron — un caissier ou le lien
// employé n'ont pas accès aux chiffres du restaurant.

import { getRecentEvents, listClients } from "../../lib/db";
import { pointsParJour, heuresDePointe, joursDeLaSemaine, nouveauxClientsParSemaine, statTiles } from "../../lib/stats";
import { getRole } from "../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }
  const role = getRole(req);
  if (role !== "owner") {
    return res.status(401).json({ error: "Réservé au compte principal du restaurant." });
  }

  try {
    const [events, clients] = await Promise.all([getRecentEvents(), listClients()]);

    return res.status(200).json({
      tiles: statTiles(events, clients),
      pointsParJour: pointsParJour(events),
      heuresDePointe: heuresDePointe(events),
      joursDeLaSemaine: joursDeLaSemaine(events),
      nouveauxClientsParSemaine: nouveauxClientsParSemaine(clients),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
