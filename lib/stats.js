// lib/stats.js
//
// Calculs pour la page "Statistiques" de l'espace commerçant, à partir du
// journal d'événements (chaque point ajouté, horodaté — voir
// logStampEvent dans lib/db.js) et de la liste des clients. Fonctions
// pures et testables sans réseau : on leur donne des tableaux, elles
// renvoient des séries prêtes à afficher (pas d'accès Redis ici).

const DAY = 24 * 60 * 60 * 1000;
const JOURS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MOIS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

/** Total de points ajoutés par jour, sur les N derniers jours. */
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

/**
 * Courbe CUMULATIVE du nombre total de clients fidélisés au fil du temps
 * (une carte créée = un client compté définitivement, même s'il ne revient
 * plus ensuite) — demandée par le commerçant pour visualiser la croissance
 * de sa base de clients, avec un sélecteur de période.
 *
 * `range` :
 *   - "jour"    : 30 derniers jours, un point par jour
 *   - "semaine" : 12 dernières semaines, un point par semaine
 *   - "mois"    : 12 derniers mois, un point par mois (par défaut)
 *   - "annee"   : 5 dernières années, un point par année
 *   - "debut"   : historique complet depuis le tout premier client, avec un
 *                 pas qui s'adapte automatiquement (jour → semaine → mois →
 *                 année selon l'étendue) pour ne jamais dépasser ~60 points
 *                 — au-delà, la courbe devient illisible.
 *
 * Renvoie [] si aucun client n'a encore de date d'inscription exploitable.
 */
export function evolutionClientsFidelises(clients, range = "mois") {
  const list = (clients || []).filter((c) => Number.isFinite(c.createdAt));
  if (list.length === 0) return [];

  const now = Date.now();
  const firstCreatedAt = Math.min(...list.map((c) => c.createdAt));

  function countBefore(t) {
    return list.filter((c) => c.createdAt < t).length;
  }

  function dailyBuckets(nbDays) {
    const end0 = new Date();
    end0.setHours(0, 0, 0, 0);
    end0.setDate(end0.getDate() + 1); // fin de la journée en cours
    const buckets = [];
    for (let i = nbDays - 1; i >= 0; i--) {
      const end = end0.getTime() - i * DAY;
      const d = new Date(end - 1);
      buckets.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, end });
    }
    return buckets;
  }

  function weeklyBuckets(nbWeeks) {
    const end0 = new Date();
    end0.setHours(0, 0, 0, 0);
    end0.setDate(end0.getDate() + 1);
    const buckets = [];
    for (let i = nbWeeks - 1; i >= 0; i--) {
      const end = end0.getTime() - i * 7 * DAY;
      buckets.push({ label: i === 0 ? "Cette sem." : `S-${i}`, end });
    }
    return buckets;
  }

  function monthlyBuckets(nbMonths) {
    const buckets = [];
    const refYear = new Date().getFullYear();
    const refMonth = new Date().getMonth();
    for (let i = nbMonths - 1; i >= 0; i--) {
      const monthDate = new Date(refYear, refMonth - i, 1);
      const end = new Date(refYear, refMonth - i + 1, 1).getTime();
      const label = `${MOIS_FR[monthDate.getMonth()]}${
        monthDate.getFullYear() !== refYear ? " " + String(monthDate.getFullYear()).slice(2) : ""
      }`;
      buckets.push({ label, end });
    }
    return buckets;
  }

  function yearlyBuckets(nbYears) {
    const buckets = [];
    const refYear = new Date().getFullYear();
    for (let i = nbYears - 1; i >= 0; i--) {
      const year = refYear - i;
      buckets.push({ label: String(year), end: new Date(year + 1, 0, 1).getTime() });
    }
    return buckets;
  }

  let buckets;
  if (range === "jour") {
    buckets = dailyBuckets(30);
  } else if (range === "semaine") {
    buckets = weeklyBuckets(12);
  } else if (range === "annee") {
    buckets = yearlyBuckets(5);
  } else if (range === "debut") {
    const spanDays = Math.max(1, (now - firstCreatedAt) / DAY);
    if (spanDays <= 45) {
      buckets = dailyBuckets(Math.ceil(spanDays) + 1);
    } else if (spanDays <= 7 * 26) {
      buckets = weeklyBuckets(Math.ceil(spanDays / 7) + 1);
    } else if (spanDays <= 365 * 6) {
      buckets = monthlyBuckets(Math.min(72, Math.ceil(spanDays / 30) + 1));
    } else {
      buckets = yearlyBuckets(Math.ceil(spanDays / 365) + 1);
    }
  } else {
    buckets = monthlyBuckets(12);
  }

  // Sous-échantillonnage si trop de points, pour garder la courbe lisible.
  const MAX_POINTS = 60;
  if (buckets.length > MAX_POINTS) {
    const stride = Math.ceil(buckets.length / MAX_POINTS);
    buckets = buckets.filter((_, i) => i % stride === 0 || i === buckets.length - 1);
  }

  return buckets.map(({ label, end }) => ({ label, value: countBefore(end) }));
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
