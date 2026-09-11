// lib/appleWallet.js
//
// Structure de départ pour le support Apple Wallet (carte de fidélité au
// format .pkpass), demandé par Adam pour se rapprocher de l'offre du
// concurrent Fidelix. Contrairement à Google Wallet (lib/walletObjects.js),
// ce fichier n'est PAS fonctionnel : Apple exige, pour signer un pass :
//
//   1. Un compte Apple Developer Program (payant, ~99 $/an) ;
//   2. Un identifiant de type de pass (Pass Type ID), créé sur
//      developer.apple.com, avec son certificat (.p12) et son mot de passe ;
//   3. Le certificat intermédiaire Apple WWDG/WWDR (public, téléchargeable) ;
//   4. Le Team ID du compte développeur.
//
// Rien de tout cela n'existe encore pour Fidélions — la structure ci-dessous
// est prête à être branchée dès qu'Adam aura ces éléments (voir le README
// pour la procédure), sans qu'aucune autre partie du code n'ait besoin de
// changer : isAppleWalletConfigured() passera à true, et generateApplePass()
// n'aura plus qu'à être complétée avec une librairie de signature de pass
// (ex : "passkit-generator" sur npm) plutôt que de renvoyer une erreur.
//
// En attendant, l'interface (pages/r/[slug].js, page d'accueil) affiche un
// bouton "Apple Wallet — bientôt disponible" plutôt que de proposer un
// bouton qui échouerait silencieusement.

/** Vrai dès que les 4 identifiants Apple nécessaires sont présents. */
export function isAppleWalletConfigured() {
  return !!(
    process.env.APPLE_TEAM_ID &&
    process.env.APPLE_PASS_TYPE_ID &&
    process.env.APPLE_PASS_CERT_BASE64 && // certificat .p12 encodé en base64
    process.env.APPLE_PASS_CERT_PASSWORD
  );
}

/**
 * Générera un fichier .pkpass (carte de fidélité "storeCard") pour un
 * client donné, une fois les certificats disponibles. Pour l'instant,
 * renvoie toujours une erreur explicite plutôt que de faire semblant de
 * fonctionner — voir isAppleWalletConfigured().
 *
 * Quand ce sera branché, la structure attendue du pass est déjà esquissée
 * ci-dessous à titre de référence (format "storeCard" du standard Apple
 * PassKit) :
 *
 * {
 *   formatVersion: 1,
 *   passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID,
 *   teamIdentifier: process.env.APPLE_TEAM_ID,
 *   organizationName: "Fidélions",
 *   serialNumber: client.objectId,
 *   description: `Carte de fidélité ${merchant.restaurantName}`,
 *   backgroundColor: merchant.hexColor,
 *   storeCard: {
 *     primaryFields: [{ key: "points", label: "Points", value: client.points }],
 *     secondaryFields: [{ key: "name", label: "Client", value: client.prenom }],
 *   },
 *   barcodes: [{ format: "PKBarcodeFormatQR", message: client.objectId, messageEncoding: "iso-8859-1" }],
 * }
 */
export async function generateApplePass() {
  if (!isAppleWalletConfigured()) {
    throw new Error(
      "Apple Wallet n'est pas encore configuré pour Fidélions (il manque le compte développeur Apple et ses certificats — voir lib/appleWallet.js)."
    );
  }
  // À compléter dès que les certificats existent : signature du pass avec
  // une librairie telle que "passkit-generator", puis renvoi du buffer
  // .pkpass à la route API qui appelle cette fonction.
  throw new Error("Génération Apple Wallet non implémentée.");
}
