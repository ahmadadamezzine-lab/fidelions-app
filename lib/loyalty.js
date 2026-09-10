// lib/loyalty.js
//
// Logique pure de calcul des récompenses. Depuis la fusion "tampons"/
// "points" en un seul système ("points", vocabulaire universel — un
// coiffeur ou un supermarché ne "tamponnent" rien, mais donnent des
// points comme n'importe quel autre commerce), il n'y a plus qu'UN seul
// concept de fidélité ; ce qui varie, c'est le nombre de paliers de
// récompense que le commerçant a définis :
// - un seul palier : carte classique, la récompense se redéclenche à
//   chaque multiple du seuil (comportement historique de Fidélions,
//   inchangé) ;
// - plusieurs paliers : chacun ne se débloque qu'UNE fois, quand le
//   total cumulé le dépasse pour la première fois (comme Sydely).
//
// Isolé ici (aucun accès réseau/Redis) pour être testable directement avec
// node, sans dépendance externe.

/** Récompense à seuil unique (un seul palier défini) : se redéclenche à chaque multiple du seuil. */
export function computeSingleTierReward(points, tiers) {
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
