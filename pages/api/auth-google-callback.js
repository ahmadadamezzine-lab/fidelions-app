// pages/api/auth-google-callback.js
//
// Retour du flux "Continuer avec Google" (voir auth-google-start.js) :
// échange le code contre un jeton Google, vérifie l'email, puis :
//  - email déjà connu -> connexion directe (jeton de session Fidélions,
//    exactement comme /api/auth-login), retour vers /commercant.
//  - email inconnu -> pas de création automatique du compte (l'inscription
//    a besoin du nom du commerce, du type d'activité, de la formule
//    tarifaire… voir le formulaire) : retour vers /commercant avec l'écran
//    d'inscription ouvert et l'email déjà rempli, à la dernière étape.

import { getMerchantByEmail } from "../../lib/db";
import { signSession, buildSessionCookie } from "../../lib/session";
import { exchangeGoogleCode, verifyGoogleIdToken, getRedirectUri } from "../../lib/googleAuth";

function parseCookie(req, name) {
  const raw = req.headers.cookie || "";
  const match = raw
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : null;
}

const CLEAR_STATE_COOKIE = "fid_g_state=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax";

function clearStateCookie(res) {
  res.setHeader("Set-Cookie", CLEAR_STATE_COOKIE);
}

export default async function handler(req, res) {
  const { code, state, error: googleError } = req.query;

  function fail(message) {
    clearStateCookie(res);
    res.writeHead(302, { Location: `/commercant?mode=login&oauth_error=${encodeURIComponent(message)}` });
    res.end();
  }

  if (googleError) {
    fail("Connexion Google annulée.");
    return;
  }

  const savedState = parseCookie(req, "fid_g_state");
  if (!code || !state || !savedState || state !== savedState) {
    fail("Session Google invalide, réessaie.");
    return;
  }
  clearStateCookie(res);

  try {
    const redirectUri = getRedirectUri(req);
    const tokens = await exchangeGoogleCode({ code, redirectUri });
    const { email, name } = await verifyGoogleIdToken(tokens.id_token);

    const merchant = await getMerchantByEmail(email);
    if (merchant) {
      const token = signSession({ merchantId: merchant.id });
      // Le jeton part directement dans un cookie httpOnly plutôt que dans
      // l'URL de redirection : une URL avec un jeton de connexion dedans se
      // retrouve dans l'historique du navigateur, les logs serveur, et le
      // Referer envoyé à d'éventuelles ressources externes de la page — un
      // cookie httpOnly n'apparaît dans aucun de ces endroits. Le paramètre
      // `oauth=success` n'est qu'un signal, sans donnée sensible : il dit au
      // client de vérifier sa session (voir tryAuth dans commercant.js), qui
      // la retrouve via ce cookie.
      // Deux cookies à envoyer dans la même réponse (celui qui efface
      // fid_g_state ET celui qui pose la session) — setHeader avec un
      // tableau envoie bien deux en-têtes Set-Cookie distincts, alors que
      // l'appeler deux fois de suite écraserait le premier.
      res.setHeader("Set-Cookie", [CLEAR_STATE_COOKIE, buildSessionCookie(token)]);
      res.writeHead(302, { Location: "/commercant?oauth=success" });
      res.end();
      return;
    }

    // Pas de compte pour cet email : direction l'inscription, avec l'email
    // pré-rempli — le mot de passe est généré automatiquement côté client
    // (voir pages/commercant.js, signupViaGoogle) puisque ce commerçant se
    // reconnectera toujours via le bouton Google, jamais en le tapant.
    const params = new URLSearchParams({
      mode: "signup",
      oauth_email: email,
      oauth_name: name || "",
    });
    res.writeHead(302, { Location: `/commercant?${params.toString()}` });
    res.end();
  } catch (err) {
    console.error("Connexion Google échouée :", err);
    fail(err.message || "Connexion Google impossible.");
  }
}
