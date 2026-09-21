// lib/groq.js
//
// Filet de secours "IA open source" pour l'analyse de menu (voir
// lib/menuAnalysis.js) : quand Gemini (lib/ai.js) est à quota — le cas
// vécu par Adam, "limite gratuite Gemini atteinte" — ou indisponible, on
// retombe automatiquement sur Groq, qui héberge GRATUITEMENT plusieurs
// modèles à POIDS OUVERTS (Meta Llama — contrairement à Gemini/GPT qui
// sont propriétaires) sur son propre matériel, avec son propre quota
// gratuit totalement séparé de celui de Google. Compte gratuit, sans
// carte bancaire, sur console.groq.com (voir le README).
//
// Simple fetch vers l'API de Groq (compatible avec le format OpenAI) —
// pas de librairie à installer, même choix que Stripe/QStash/Resend
// ailleurs dans ce projet.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Cascade de modèles Groq, tous à poids ouverts. Texte : le plus capable
// d'abord (llama-3.3-70b-versatile), puis un modèle plus petit en secours
// (llama-3.1-8b-instant) — quota quotidien séparé et bien plus large
// (14 400 requêtes/jour contre 1 000 pour le 70B), donc peu de chances que
// les deux soient à quota en même temps. Image : un modèle multimodal
// dédié (llama-4-scout), avec llama-4-maverick en repli. Comme pour la
// cascade Gemini (voir lib/ai.js), ce sont des noms de modèles qui peuvent
// être retirés par Groq avec le temps — si un jour l'un d'eux ne répond
// plus (404), voir console.groq.com/docs/models pour son remplaçant.
const TEXT_MODEL_CASCADE = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
const VISION_MODEL_CASCADE = [
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
];

// Même exigence de fond que le prompt Gemini (voir lib/ai.js) — vraies
// stratégies ancrées dans le menu, tips cachés de psychologie
// comportementale — reformulé pour le "JSON mode" de Groq (response_format:
// json_object), qui garantit un JSON valide mais n'impose pas de schéma
// strict comme le responseSchema de Gemini : on décrit donc la forme
// exacte attendue directement dans le prompt.
const PROMPT = `Tu es un consultant en stratégie marketing et fidélisation, spécialisé dans la restauration indépendante. On te donne le menu d'un restaurant (texte, ou description d'une photo). Analyse-le et comprends son contenu par toi-même : type de cuisine, gamme de prix, plats à forte marge probable (boissons, desserts, accompagnements) vs plats d'appel, structure de la carte.

Réfléchis vraiment avant de répondre — ne sors pas des idées génériques interchangeables d'un restaurant à l'autre ("fais une promo", "offre une réduction"). Chaque suggestion doit être une vraie tactique, ancrée dans CE menu précis (cite de vrais noms de plats et prix), et doit combiner :
- des idées de campagnes/offres directement lançables (formule, happy hour, offre du jour, réduction ciblée...) ;
- des "tips cachés" — des leviers de psychologie comportementale et de fidélisation que la plupart des restaurateurs indépendants n'utilisent pas consciemment, par exemple : l'effet de progression acquise, l'aversion à la perte près du seuil, l'ancrage par une récompense phare, le regroupement d'un plat à forte marge avec la récompense, le bon moment pour notifier, la rareté/urgence dosée plutôt que permanente.

Pour chaque tip caché, commence le texte par "🔑 Tip caché — " et explique en une phrase POURQUOI ça marche.

Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte avant ou après, ni balises markdown, au format exact :
{"items": [{"name": "nom du plat", "price": 12.5}], "suggestions": ["idée ou tip 1", "idée ou tip 2"]}

Règles :
- "items" : liste les plats/boissons/menus identifiés avec leur prix en euros (nombre, sans le symbole €). Ignore les lignes sans prix lisible.
- "suggestions" : 6 à 8 éléments, en alternant idées de campagnes concrètes et tips cachés (au moins 3 tips cachés). Chaque élément fait 2 à 4 phrases complètes. En français.
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

async function callGroq(model, apiKey, messages) {
  let res;
  try {
    res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.8,
        max_tokens: 3000,
        response_format: { type: "json_object" },
      }),
    });
  } catch (err) {
    return { ok: false, transient: true, networkError: true, err };
  }

  if (res.ok) return { ok: true, res };

  const body = await res.text().catch(() => "");
  // 429 (quota Groq dépassé) et 503 (surcharge) : on passe au modèle
  // suivant de la cascade plutôt que d'abandonner tout de suite.
  const transient = res.status === 429 || res.status === 503 || res.status === 500;
  return { ok: false, transient, status: res.status, body };
}

/**
 * Analyse un document avec Groq (modèles à poids ouverts). `file` : une
 * IMAGE uniquement (les modèles Groq ne lisent pas un PDF directement,
 * contrairement à Gemini) — un PDF envoyé ici lève une erreur claire, à
 * charge pour lib/menuAnalysis.js de la transformer en message utile.
 */
export async function analyzeMenuWithGroq({ text, file }) {
  const apiKey = (process.env.GROQ_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY manquant : crée une clé gratuite sur console.groq.com/keys et ajoute-la dans les variables d'environnement Vercel."
    );
  }
  const cleanText = (text || "").trim();
  if (!file && !cleanText) {
    throw new Error("Aucun contenu à analyser : écris ou importe un menu d'abord.");
  }
  if (file && file.mimeType === "application/pdf") {
    throw new Error(
      "Le mode secours (IA open source) ne sait pas encore lire un PDF directement — colle le texte du menu, ou prends-le en photo, ou réessaie l'analyse normale dans quelques minutes."
    );
  }

  const isImage = file && file.base64 && file.mimeType && file.mimeType.startsWith("image/");
  const cascade = isImage ? VISION_MODEL_CASCADE : TEXT_MODEL_CASCADE;

  let messages;
  if (isImage) {
    const userContent = [{ type: "text", text: PROMPT }];
    if (cleanText) userContent.push({ type: "text", text: cleanText.slice(0, 8000) });
    userContent.push({ type: "image_url", image_url: { url: `data:${file.mimeType};base64,${file.base64}` } });
    messages = [{ role: "user", content: userContent }];
  } else {
    messages = [{ role: "user", content: `${PROMPT}\n\nMenu :\n${cleanText.slice(0, 8000)}` }];
  }

  let res = null;
  let lastFailure = null;
  for (const model of cascade) {
    const attempt = await callGroq(model, apiKey, messages);
    if (attempt.ok) {
      res = attempt.res;
      break;
    }
    if (!attempt.transient) {
      if (attempt.status === 401 || attempt.status === 403) {
        throw new Error("Clé GROQ_API_KEY invalide ou refusée — recrée-en une sur console.groq.com/keys.");
      }
      if (attempt.status === 404) {
        // Modèle retiré côté Groq : on continue la cascade.
        lastFailure = attempt;
        continue;
      }
      throw new Error(`Échec de l'analyse IA (mode secours, ${attempt.status}) : ${(attempt.body || "").slice(0, 300)}`);
    }
    lastFailure = attempt;
  }

  if (!res) {
    if (lastFailure && lastFailure.networkError) {
      throw new Error("Impossible de joindre le service IA de secours (réseau) — réessaie dans un instant.");
    }
    throw new Error("Le service IA de secours (Groq) est aussi temporairement surchargé ou à quota — réessaie dans quelques minutes.");
  }

  const data = await res.json();
  const outputText = data?.choices?.[0]?.message?.content || "";
  if (!outputText) {
    throw new Error("L'IA n'a rien renvoyé — le document est peut-être illisible.");
  }

  const parsed = extractJson(outputText);
  const items = Array.isArray(parsed.items)
    ? parsed.items
        .filter((it) => it && it.name && Number(it.price) > 0)
        .map((it) => ({ name: String(it.name).slice(0, 80), price: Number(it.price) }))
        .slice(0, 60)
    : [];
  const suggestions = Array.isArray(parsed.suggestions)
    ? parsed.suggestions.filter(Boolean).map((s) => String(s).slice(0, 600)).slice(0, 8)
    : [];

  if (items.length === 0 && suggestions.length === 0) {
    throw new Error("L'IA n'a rien trouvé d'exploitable dans ce document.");
  }

  return { items, suggestions };
}
