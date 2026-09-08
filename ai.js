// lib/ai.js
//
// Vraie IA (Google Gemini — gratuit, sans carte bancaire) qui LIT et
// COMPREND toute seule le document envoyé par le commerçant : texte
// collé, PDF, ou simple photo du menu prise au téléphone. Pas de règles
// écrites à la main ici — le modèle reçoit le document et répond
// directement avec les plats détectés et des idées de promotions.
//
// Un simple appel réseau (fetch vers l'API Gemini) : pas de librairie à
// installer, ce qui compte vu qu'on ne peut pas ajouter de dépendance
// npm facilement sur cet environnement.

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const PROMPT = `Tu es un assistant pour un restaurant qui utilise un programme de fidélité. On te donne le menu du restaurant (texte, PDF, ou photo). Analyse-le et comprends son contenu par toi-même, puis réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte avant ou après, au format exact :
{
  "items": [{"name": "nom du plat", "price": 12.5}],
  "suggestions": ["idée de promotion 1", "idée de promotion 2", "idée de promotion 3"]
}
Règles :
- "items" : liste les plats/boissons/menus que tu identifies avec leur prix en euros (nombre, sans le symbole €). Ignore les lignes sans prix lisible.
- "suggestions" : 3 à 5 idées concrètes et directement utilisables de promotions ou d'offres fidélité, en citant de vrais noms de plats du document quand c'est pertinent (formule, happy hour, offre du jour, réduction ciblée, menu à prix réduit...). En français, phrases courtes.
- Aucun texte en dehors du JSON.`;

function extractJson(rawText) {
  const cleaned = (rawText || "")
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Réponse IA illisible (pas de JSON trouvé).");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

/**
 * Analyse un document avec Gemini. `text` = texte collé/écrit à la main.
 * `file` = { mimeType, base64 } pour un PDF ou une image envoyée telle
 * quelle (Gemini lit directement le PDF/l'image, pas besoin d'OCR séparé).
 * Renvoie { items, suggestions }.
 */
export async function analyzeMenuWithAI({ text, file }) {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY manquant : crée une clé gratuite sur aistudio.google.com/apikey et ajoute-la dans les variables d'environnement Vercel."
    );
  }
  const cleanText = (text || "").trim();
  if (!file && !cleanText) {
    throw new Error("Aucun contenu à analyser : écris ou importe un menu d'abord.");
  }

  const parts = [];
  if (file && file.base64 && file.mimeType) {
    parts.push({ inline_data: { mime_type: file.mimeType, data: file.base64 } });
  }
  if (cleanText) {
    parts.push({ text: cleanText.slice(0, 8000) });
  }
  parts.push({ text: PROMPT });

  let res;
  try {
    res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
      }),
    });
  } catch (err) {
    throw new Error("Impossible de joindre le service IA (réseau) — réessaie dans un instant.");
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 429) {
      throw new Error(
        "Limite gratuite Gemini atteinte pour l'instant (quota par minute/jour) — réessaie dans quelques minutes."
      );
    }
    if (res.status === 400 && /API key/i.test(body)) {
      throw new Error("Clé GEMINI_API_KEY invalide — recrée-en une sur aistudio.google.com/apikey.");
    }
    throw new Error(`Échec de l'analyse IA (${res.status}) : ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const blockReason = data?.promptFeedback?.blockReason;
  if (blockReason) {
    throw new Error("Le document n'a pas pu être analysé (contenu refusé par le filtre IA).");
  }
  const outputText =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  if (!outputText) {
    throw new Error(
      "L'IA n'a rien renvoyé — le document est peut-être illisible (photo floue, PDF scanné vide...)."
    );
  }

  const parsed = extractJson(outputText);
  const items = Array.isArray(parsed.items)
    ? parsed.items
        .filter((it) => it && it.name && Number(it.price) > 0)
        .map((it) => ({ name: String(it.name).slice(0, 80), price: Number(it.price) }))
        .slice(0, 60)
    : [];
  const suggestions = Array.isArray(parsed.suggestions)
    ? parsed.suggestions.filter(Boolean).map((s) => String(s).slice(0, 200)).slice(0, 6)
    : [];

  if (items.length === 0 && suggestions.length === 0) {
    throw new Error("L'IA n'a rien trouvé d'exploitable dans ce document.");
  }

  return { items, suggestions };
}
