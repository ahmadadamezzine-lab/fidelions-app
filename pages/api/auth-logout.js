// pages/api/auth-logout.js
//
// Efface le cookie de session httpOnly (voir lib/session.js) — un cookie
// httpOnly n'étant jamais accessible en JavaScript, il ne peut pas être
// supprimé depuis le navigateur : il faut un aller-retour serveur qui
// renvoie le même cookie avec Max-Age=0 pour que le navigateur le jette.
// Appelée par handleLogout() dans pages/commercant.js.

import { buildLogoutCookie } from "../../lib/session";

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }
  res.setHeader("Set-Cookie", buildLogoutCookie());
  return res.status(200).json({ ok: true });
}
