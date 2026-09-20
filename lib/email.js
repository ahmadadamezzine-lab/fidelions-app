// lib/email.js
//
// Envoi d'email via l'API REST de Resend (resend.com) — un simple fetch,
// pas besoin d'installer leur librairie. Compte gratuit (3000 emails/mois),
// et sans configurer de domaine on peut déjà envoyer depuis
// "onboarding@resend.dev" (moins joli, mais fonctionnel tout de suite).

const RESEND_API_URL = "https://api.resend.com/emails";

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function isValidHexColor(value) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

/**
 * Envoie un email simple (titre + message en texte, mis en forme en HTML
 * basique). Renvoie true/false plutôt que de faire planter l'appelant —
 * l'email est un canal parmi d'autres dans les campagnes, jamais bloquant.
 *
 * `fromName`, `logoUrl` et `accentColor` habillent l'email aux couleurs du
 * COMMERCE plutôt qu'à celles de Fidélions : le client d'un restaurant qui
 * reçoit une notification de points doit voir le nom et le logo de ce
 * restaurant, pas "Fidélions" — Fidélions est l'outil, pas la marque que
 * le client final doit connaître. Resend (sur le plan gratuit, sans
 * domaine personnalisé vérifié) n'autorise pas de changer l'adresse
 * d'envoi elle-même, mais le NOM affiché avant cette adresse (ce que voit
 * le client dans sa boîte mail) est entièrement libre : c'est ce
 * qu'utilise `fromName`. Si un commerce n'a pas encore de logo/couleur
 * personnalisés, on retombe sur l'identité Fidélions par défaut.
 *
 * `ctaLabel`/`ctaUrl` (facultatifs) ajoutent un vrai bouton cliquable —
 * utilisé par la demande d'avis Google automatique (voir
 * pages/api/notify/review-request.js) : contrairement à une notification
 * Wallet, qui ne peut qu'ouvrir la carte elle-même, un email PEUT contenir
 * un bouton qui ouvre n'importe quel lien externe, donc c'est le seul
 * canal qui peut réellement tenir la promesse d'un "bouton direct vers
 * l'avis Google".
 */
export async function sendEmail({ to, subject, text, fromName, logoUrl, accentColor, ctaLabel, ctaUrl }) {
  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY manquant : crée un compte gratuit sur resend.com et ajoute ta clé API dans les variables d'environnement Vercel."
    );
  }
  const senderAddress = ((process.env.RESEND_FROM_EMAIL || "").trim() || "onboarding@resend.dev")
    .replace(/^.*<(.+)>$/, "$1"); // au cas où la variable contiendrait déjà un nom, on ne garde que l'adresse
  const displayName = (fromName || "").trim().slice(0, 70) || "Fidélions";
  const from = `${displayName} <${senderAddress}>`;

  const color = isValidHexColor(accentColor) ? accentColor.trim() : "#7414F4";
  const logo = (logoUrl || "").trim();

  const cleanCtaUrl = (ctaUrl || "").trim();
  const cleanCtaLabel = (ctaLabel || "").trim();
  const hasCta = cleanCtaUrl && /^https?:\/\//i.test(cleanCtaUrl);
  const ctaHtml = hasCta
    ? `<p style="margin: 24px 0;">
         <a href="${escapeHtml(cleanCtaUrl)}" style="display:inline-block; background:${color}; color:#ffffff; text-decoration:none; font-weight:600; font-size:14px; padding:12px 24px; border-radius:8px;">
           ${escapeHtml(cleanCtaLabel || "En savoir plus")}
         </a>
       </p>`
    : "";
  // Le lien brut est aussi ajouté à la fin du texte (HTML et version texte
  // brut) : certains clients mail bloquent les boutons stylés par défaut,
  // le lien texte garantit que l'action reste possible dans tous les cas.
  const textWithCta = hasCta ? `${text}\n\n${cleanCtaLabel || "Lien"} : ${cleanCtaUrl}` : text;

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      ${logo ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(displayName)}" style="max-height:48px; max-width:220px; margin-bottom:16px;" />` : ""}
      <h2 style="color:${color}; margin: 0 0 12px;">${escapeHtml(subject)}</h2>
      <p style="font-size: 15px; line-height: 1.6; color: #1a1a1a; white-space: pre-wrap;">${escapeHtml(text)}</p>
      ${ctaHtml}
      <p style="font-size: 11px; color: #999; margin-top: 28px;">Programme de fidélité propulsé par Fidélions.</p>
    </div>
  `;

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html, text: textWithCta }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Échec d'envoi email (${res.status}) : ${body}`);
  }
  return true;
}
