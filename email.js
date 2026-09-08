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

/**
 * Envoie un email simple (titre + message en texte, mis en forme en HTML
 * basique). Renvoie true/false plutôt que de faire planter l'appelant —
 * l'email est un canal parmi d'autres dans les campagnes, jamais bloquant.
 */
export async function sendEmail({ to, subject, text }) {
  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY manquant : crée un compte gratuit sur resend.com et ajoute ta clé API dans les variables d'environnement Vercel."
    );
  }
  const from = (process.env.RESEND_FROM_EMAIL || "").trim() || "Fidélions <onboarding@resend.dev>";

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color:#7414F4; margin: 0 0 12px;">${escapeHtml(subject)}</h2>
      <p style="font-size: 15px; line-height: 1.6; color: #1a1a1a; white-space: pre-wrap;">${escapeHtml(text)}</p>
    </div>
  `;

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Échec d'envoi email (${res.status}) : ${body}`);
  }
  return true;
}
