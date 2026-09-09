// lib/stats.js
//
// Calculs pour la page "Statistiques" de l'espace commerçant, à partir du
// journal d'événements (chaque tampon/point ajouté, horodaté — voir
// logStampEvent dans lib/db.js) et de la liste des clients. Fonctions
// pures et testables sans réseau : on leur donne des tableaux, elles
// renvoient des séries prêtes à afficher (pas d'accès Redis ici).

const DAY = 24 * 60 * 60 * 1000;
const JOURS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

/** Total de points/tampons ajoutés par jour, sur les N derniers jours. */
export function pointsParJour(events, days = 14) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const buckets = [];
  for (let i = days - 1; i >= 0; i--) {
    const start = now.getTime() - i * DAY;
    const d = new Date(start);
    buckets.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, start, value: 0 });
  }
  for (const ev of events || []) {
    const b = buckets.find((b) => ev.at >= b.start && ev.at < b.start + DAY);
    if (b) b.value += ev.delta || 0;
  }
  return buckets.map(({ label, value }) => ({ label, value }));
}

/** Répartition des passages par heure de la journée (0h à 23h). */
export function heuresDePointe(events) {
  const buckets = Array.from({ length: 24 }, (_, h) => ({ label: `${h}h`, value: 0 }));
  for (const ev of events || []) {
    const h = new Date(ev.at).getHours();
    buckets[h].value += 1;
  }
  return buckets;
}

/** Répartition des passages par jour de la semaine (lundi en premier). */
export function joursDeLaSemaine(events) {
  const order = [1, 2, 3, 4, 5, 6, 0]; // lundi..dimanche (Date.getDay() : dimanche = 0)
  const counts = new Array(7).fill(0);
  for (const ev of events || []) {
    counts[new Date(ev.at).getDay()] += 1;
  }
  return order.map((dayIndex) => ({ label: JOURS_FR[dayIndex], value: counts[dayIndex] }));
}

/** Nouveaux clients inscrits par semaine, sur les N dernières semaines. */
export function nouveauxClientsParSemaine(clients, weeks = 8) {
  const now = Date.now();
  const buckets = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = now - (i + 1) * 7 * DAY;
    const end = now - i * 7 * DAY;
    buckets.push({ label: i === 0 ? "Cette sem." : `S-${i}`, start, end, value: 0 });
  }
  for (const c of clients || []) {
    const b = buckets.find((b) => c.createdAt >= b.start && c.createdAt < b.end);
    if (b) b.value += 1;
  }
  return buckets.map(({ label, value }) => ({ label, value }));
}

function pct(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/** Les 3 tuiles de stats en haut de page (points/nouveaux clients/récompenses). */
export function statTiles(events, clients) {
  const now = Date.now();
  const WEEK = 7 * DAY;

  const pointsThisWeek = (events || [])
    .filter((e) => now - e.at < WEEK)
    .reduce((s, e) => s + (e.delta || 0), 0);
  const pointsLastWeek = (events || [])
    .filter((e) => now - e.at >= WEEK && now - e.at < 2 * WEEK)
    .reduce((s, e) => s + (e.delta || 0), 0);

  const newClientsThisWeek = (clients || []).filter((c) => now - c.createdAt < WEEK).length;
  const newClientsLastWeek = (clients || []).filter(
    (c) => now - c.createdAt >= WEEK && now - c.createdAt < 2 * WEEK
  ).length;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const rewardsThisMonth = (events || []).filter(
    (e) => e.at >= monthStart.getTime() && e.rewardReached
  ).length;

  return {
    pointsThisWeek,
    pointsChangePct: pct(pointsThisWeek, pointsLastWeek),
    newClientsThisWeek,
    newClientsChangePct: pct(newClientsThisWeek, newClientsLastWeek),
    rewardsThisMonth,
  };
}
