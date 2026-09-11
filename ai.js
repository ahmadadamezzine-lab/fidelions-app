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

// Cascade de plusieurs alias de modèles Gemini, chacun avec son PROPRE
// quota/pool de charge chez Google — si le premier modèle est surchargé
// (503/500), on retombe sur le suivant au lieu d'abandonner tout de
// suite : ça absorbe le cas fréquent où UN SEUL modèle est temporairement
// saturé alors que les autres répondent normalement. "gemini-flash-latest"
// reste en premier (le plus rapide), "gemini-flash-lite-latest" en repli
// (plus léger, pool distinct), et "gemini-pro-latest" en tout dernier
// recours (plus lent/coûteux mais généralement moins sollicité). Ce sont
// des alias qui pointent toujours vers le modèle actuel de chaque gamme
// (au lieu d'un numéro de version figé) — les modèles Gemini sont retirés
// régulièrement (ex : gemini-2.0-flash a été arrêté mi-2026) — les alias
// évitent que cette fonctionnalité se casse toute seule au prochain
// retrait de modèle.
const GEMINI_MODEL_CASCADE = ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-pro-latest"];

function geminiUrlFor(model) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

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
 * Appelle un seul modèle Gemini, avec un court retry sur les erreurs
 * transitoires (503/500 — pic de charge temporaire, pas une vraie panne).
 * Renvoie soit { ok: true, res }, soit { ok: false, transient, status,
 * body } pour laisser l'appelant décider de basculer sur le modèle
 * suivant de la cascade (uniquement pour les erreurs transitoires — une
 * clé invalide ou un quota dépassé, par exemple, ne changerait pas de
 * résultat sur un autre modèle, donc on abandonne tout de suite).
 */
async function callGeminiModel(model, apiKey, parts) {
  const MAX_ATTEMPTS = 2;
  let res;
  let lastBody = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      res = await fetch(geminiUrlFor(model), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
        }),
      });
    } catch (err) {
      if (attempt === MAX_ATTEMPTS) {
        return { ok: false, transient: true, networkError: true, err };
      }
      await new Promise((r) => setTimeout(r, attempt * 900));
      continue;
    }

    if (res.ok) return { ok: true, res };

    lastBody = await res.text().catch(() => "");
    const transient = res.status === 503 || res.status === 500;
    if (transient && attempt < MAX_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, attempt * 900));
      continue;
    }

    return { ok: false, transient, status: res.status, body: lastBody };
  }
  return { ok: false, transient: true, status: res?.status, body: lastBody };
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

  // Auth par en-tête x-goog-api-key (méthode recommandée par Google) plutôt
  // que par ?key= dans l'URL — plus fiable avec les clés récentes (format
  // "AQ." que Google délivre depuis 2026, à la place des anciennes clés
  // "AIza...").
  let res = null;
  let lastFailure = null;
  for (const model of GEMINI_MODEL_CASCADE) {
    const attempt = await callGeminiModel(model, apiKey, parts);
    if (attempt.ok) {
      res = attempt.res;
      break;
    }

    // Erreur définitive (pas de charge) : inutile d'essayer les autres
    // modèles de la cascade, le résultat serait le même.
    if (!attempt.transient) {
      if (attempt.status === 429) {
        throw new Error(
          "Limite gratuite Gemini atteinte pour l'instant (quota par minute/jour) — réessaie dans quelques minutes."
        );
      }
      if (attempt.status === 401 || attempt.status === 403 || (attempt.status === 400 && /API key/i.test(attempt.body || ""))) {
        throw new Error("Clé GEMINI_API_KEY invalide ou refusée — recrée-en une sur aistudio.google.com/apikey.");
      }
      if (attempt.status === 404) {
        // Modèle retiré : on continue la cascade plutôt que d'abandonner —
        // un autre alias de la liste répond peut-être encore.
        lastFailure = attempt;
        continue;
      }
      throw new Error(`Échec de l'analyse IA (${attempt.status}) : ${(attempt.body || "").slice(0, 300)}`);
    }

    lastFailure = attempt;
    // Transitoire (503/500, ou réseau) : on passe au modèle suivant de la
    // cascade, qui a son propre pool de quota/charge chez Google.
  }

  if (!res) {
    if (lastFailure && lastFailure.networkError) {
      throw new Error("Impossible de joindre le service IA (réseau) — réessaie dans un instant.");
    }
    throw new Error(
      "Le service IA de Google est temporairement surchargé (forte demande) — réessaie dans une minute, ce n'est pas un bug du site."
    );
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
