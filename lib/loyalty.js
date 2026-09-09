// lib/loyalty.js
//
// Logique pure de calcul des récompenses, indépendante du mode choisi par
// le commerçant :
// - "tampons" : carte classique, un seuil unique, la récompense se
//   redéclenche à chaque multiple du seuil (comportement historique de
//   Fidélions, inchangé).
// - "points" : points cumulés à paliers multiples (comme Sydely) — chaque
//   palier ne se débloque qu'UNE fois, quand le total cumulé le dépasse
//   pour la première fois.
//
// Isolé ici (aucun accès réseau/Redis) pour être testable directement avec
// node, sans dépendance externe.

export function computeTamponsReward(points, tiers) {
  const threshold = (tiers && tiers[0] && tiers[0].threshold) || 10;
  const label = (tiers && tiers[0] && tiers[0].label) || "Récompense fidélité";
  const rewardReached = points > 0 && points % threshold === 0;
  const remaining = threshold - (points % threshold || threshold);
  return { rewardReached, remaining, label, threshold };
}

/**
 * `alreadyUnlockedIndexes` : index des paliers déjà débloqués pour ce
 * client (stocké sur sa fiche). Renvoie les paliers NOUVELLEMENT
 * débloqués par ce passage, et des infos d'affichage pour le prochain.
 */
export function computePointsRewards(points, tiers, alreadyUnlockedIndexes) {
  const unlocked = new Set(alreadyUnlockedIndexes || []);
  const sortedTiers = (tiers || [])
    .map((t, i) => ({ ...t, index: i }))
    .sort((a, b) => a.threshold - b.threshold);

  const newlyUnlocked = [];
  for (const tier of sortedTiers) {
    if (points >= tier.threshold && !unlocked.has(tier.index)) {
      newlyUnlocked.push(tier.index);
    }
  }

  const highestNewIndex = newlyUnlocked.length > 0 ? newlyUnlocked[newlyUnlocked.length - 1] : null;
  const highestNewTier = highestNewIndex !== null ? tiers[highestNewIndex] : null;

  const nextTier = sortedTiers.find(
    (t) => !unlocked.has(t.index) && !newlyUnlocked.includes(t.index) && points < t.threshold
  );

  return {
    rewardReached: newlyUnlocked.length > 0,
    newlyUnlockedIndexes: newlyUnlocked,
    label: highestNewTier ? highestNewTier.label : null,
    nextTierLabel: nextTier ? nextTier.label : null,
    remaining: nextTier ? nextTier.threshold - points : null,
  };
}
