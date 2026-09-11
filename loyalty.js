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

/**
 * Récompense à seuil unique (un seul palier défini) : se redéclenche à
 * chaque multiple du seuil.
 *
 * `previousPoints` (le solde AVANT ce passage) est optionnel mais
 * important depuis que le mode "points" (voir pages/api/add-stamp.js) peut
 * ajouter plusieurs points d'un coup selon le montant dépensé : une égalité
 * exacte (`points % threshold === 0`) suffisait quand chaque passage
 * valait toujours +1, mais un delta de plusieurs points peut sauter
 * PAR-DESSUS le seuil (ex : 7 → 12 avec un seuil à 10) sans jamais tomber
 * pile dessus. On détecte donc le franchissement d'au moins un multiple du
 * seuil entre l'ancien et le nouveau solde plutôt qu'une égalité exacte,
 * dès que ce solde précédent est connu ; à défaut (appelant historique),
 * on retombe sur l'ancien comportement.
 */
export function computeSingleTierReward(points, tiers, previousPoints = null) {
  const threshold = (tiers && tiers[0] && tiers[0].threshold) || 10;
  const label = (tiers && tiers[0] && tiers[0].label) || "Récompense fidélité";
  let rewardReached;
  if (Number.isFinite(previousPoints)) {
    rewardReached = points > 0 && Math.floor(points / threshold) > Math.floor(previousPoints / threshold);
  } else {
    rewardReached = points > 0 && points % threshold === 0;
  }
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
