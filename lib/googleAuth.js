// lib/googleAuth.js
//
// Connexion "Continuer avec Google" (voir pages/api/auth-google-start.js
// et pages/api/auth-google-callback.js) : un flux OAuth 2.0 "Authorization
// Code" classique, sans dépendance externe (pas de next-auth), pour rester
// cohérent avec le reste du projet (sessions JWT maison, voir
// lib/session.js).
//
// Nécessite deux variables d'environnement, à créer une seule fois dans
// Google Cloud Console (voir README, section "Connexion Google") :
//   GOOGLE_OAUTH_CLIENT_ID
//   GOOGLE_OAUTH_CLIENT_SECRET
// (volontairement distinctes de GOOGLE_WALLET_ISSUER_ID / des identifiants
// de service Wallet déjà utilisés ailleurs — ici il s'agit d'un identifiant
// OAuth "Application Web" à part, propre à la connexion commerçant.)

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";

function getClientId() {
  const id = (process.env.GOOGLE_OAUTH_CLIENT_ID || "").trim();
  if (!id) {
    throw new Error("Variable d'environnement manquante : GOOGLE_OAUTH_CLIENT_ID.");
  }
  return id;
}

function getClientSecret() {
  const secret = (process.env.GOOGLE_OAUTH_CLIENT_SECRET || "").trim();
  if (!secret) {
    throw new Error("Variable d'environnement manquante : GOOGLE_OAUTH_CLIENT_SECRET.");
  }
  return secret;
}

export function isGoogleAuthConfigured() {
  return Boolean(
    (process.env.GOOGLE_OAUTH_CLIENT_ID || "").trim() && (process.env.GOOGLE_OAUTH_CLIENT_SECRET || "").trim()
  );
}

/** URL de retour à enregistrer telle quelle dans Google Cloud Console. */
export function getRedirectUri(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  return `${proto}://${host}/api/auth-google-callback`;
}

export function buildGoogleAuthUrl({ redirectUri, state }) {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleCode({ code, redirectUri }) {
  const params = new URLSearchParams({
    code,
    client_id: getClientId(),
    client_secret: getClientSecret(),
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || data.error || "Échange du code Google échoué.");
  }
  return data; // { access_token, id_token, ... }
}

/**
 * Vérifie l'id_token auprès de Google (signature + audience) plutôt que de
 * le décoder nous-mêmes — évite d'avoir à gérer les clés publiques JWKS de
 * Google dans ce projet, pour un flux qui n'a lieu qu'une fois par
 * connexion (pas un chemin chaud).
 */
export async function verifyGoogleIdToken(idToken) {
  const res = await fetch(`${TOKENINFO_URL}?id_token=${encodeURIComponent(idToken)}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error("Jeton Google invalide.");
  }
  if (data.aud !== getClientId()) {
    throw new Error("Jeton Google destiné à une autre application.");
  }
  if (data.email_verified !== "true" && data.email_verified !== true) {
    throw new Error("Email Google non vérifié.");
  }
  return {
    email: data.email,
    name: data.name || "",
    givenName: data.given_name || "",
  };
}
