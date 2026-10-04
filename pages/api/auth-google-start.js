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
    // Avant ce correctif : une page d'erreur brute (texte simple, hors de
    // l'appli) puisque ce point d'entrée est une navigation complète
    // (window.location.href côté commercant.js), pas un fetch — un
    // commerçant qui cliquait "Google" sans que ces variables soient
    // configurées atterrissait sur un cul-de-sac. On revient plutôt sur
    // l'écran de connexion, avec le message affiché normalement (voir
    // oauth_error, déjà géré par pages/commercant.js pour le retour
    // d'erreur du callback OAuth réel — même mécanisme ici).
    res.writeHead(302, {
      Location: "/commercant?mode=login&oauth_error=" + encodeURIComponent("Connexion Google indisponible pour le moment."),
    });
    res.end();
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
