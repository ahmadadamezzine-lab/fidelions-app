// pages/api/apple-pass.js
//
// Point d'entrée prévu pour télécharger la carte au format Apple Wallet
// (.pkpass) — voir lib/appleWallet.js pour le détail de ce qu'il manque
// encore (compte développeur Apple + certificats). Renvoie une erreur
// claire plutôt qu'un fichier invalide tant que ce n'est pas configuré.

import { isAppleWalletConfigured, generateApplePass } from "../../lib/appleWallet";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  if (!isAppleWalletConfigured()) {
    return res.status(501).json({
      error:
        "Apple Wallet arrive bientôt sur Fidélions — cette carte est pour l'instant disponible uniquement sur Google Wallet.",
    });
  }

  try {
    const pass = await generateApplePass(req.query.objectId);
    res.setHeader("Content-Type", "application/vnd.apple.pkpass");
    return res.status(200).send(pass);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
