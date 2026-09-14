// pages/api/auth-google-start.js
//
// Point de départ de "Continuer avec Google" (boutons dans /commercant) :
// redirige vers l'écran de consentement Google, avec un jeton "state"
// aléatoire déposé dans un cookie de courte durée pour vérifier au retour
// (voir auth-google-callback.js) que la réponse correspond bien à une
// tentative initiée ici — protection CSRF standard de ce type de flux.

import crypto from "crypto";
import { buildGoogleAuthUrl, getRedirectUri, isGoogleAuthConfigured } from "../../lib/googleAuth";

export default function handler(req, res) {
  if (!isGoogleAuthConfigured()) {
    res
      .status(500)
      .send(
        "Connexion Google pas encore configurée : il manque GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET côté serveur (voir le README)."
      );
    return;
  }

  const state = crypto.randomBytes(16).toString("hex");
  res.setHeader(
    "Set-Cookie",
    `fid_g_state=${state}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax`
  );

  const redirectUri = getRedirectUri(req);
  const url = buildGoogleAuthUrl({ redirectUri, state });
  res.writeHead(302, { Location: url });
  res.end();
}
