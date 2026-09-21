// lib/advisor.js
//
// "Conseiller IA" — assistant conversationnel qui aide le commerçant sur SON
// activité (menu, promotions, fidélisation), pas juste une analyse figée en
// un seul aller-retour comme l'ancien bouton "Analyser avec l'IA". Le
// commerçant peut poser n'importe quelle question, à la suite d'une
// précédente, et joindre une photo/PDF à n'importe quel message (pas
// seulement le premier).
//
// Fiabilité : Gemini d'abord (qualité), secours automatique sur Groq (IA à
// poids ouverts, quota séparé), et si les DEUX échouent, une réponse de
// repli locale (localAdvisorFallback plus bas) — jamais un message d'erreur
// sec, conformément à la demande d'Adam ("je veux que ça marche à tous les
// coups"). Ce fichier remplace l'ancien trio lib/ai.js + lib/groq.js +
// lib/menuAnalysis.js (analyse de menu figée en un seul aller-retour,
// réponse JSON strictement structurée) par un seul module autonome, taillé
// pour un vrai fil de discussion à plusieurs tours.
//
// Simple fetch direct vers les API Gemini et Groq (mêmes fournisseurs
// qu'avant), pas de nouvelle dépendance.

const GEMINI_MODEL_CASCADE = ["gemini-pro-latest", "gemini-flash-latest", "gemini-flash-lite-latest"];
const GROQ_TEXT_MODEL_CASCADE = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
const GROQ_VISION_MODEL_CASCADE = [
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
];

function geminiUrlFor(model) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Construit le "system prompt" à partir de ce que le commerçant a déjà
// renseigné ailleurs dans le site (menu enregistré, offre actuelle, nom de
// la récompense) — pour que le conseiller réponde en connaissant déjà SON
// activité, sans que le commerçant ait à tout retaper à chaque question.
function buildSystemPrompt({ menuText, offerText, rewardLabel, rewardThreshold }) {
  let ctx = `Tu es un conseiller en stratégie marketing et fidélisation, spécialisé dans le commerce indépendant (restauration, boutiques). Tu discutes directement avec le commerçant, qui utilise Fidélions (programme de fidélité digital avec carte Google Wallet). Réponds toujours en français, de façon concrète et actionnable — jamais de conseils génériques interchangeables d'un commerce à l'autre. Quand c'est pertinent, ancre ta réponse dans SES propres plats/prix/offre ci-dessous (cite de vrais noms et prix). Peux t'appuyer sur des leviers de psychologie comportementale et de fidélisation (effet de progression acquise, aversion à la perte près du seuil, ancrage, rareté dosée...) sans jargon inutile. Réponses concises (quelques phrases à quelques paragraphes selon la question), en texte simple, sans JSON ni balises markdown lourdes.`;

  const known = [];
  if ((menuText || "").trim()) known.push(`Menu actuel du commerce :\n${menuText.trim().slice(0, 4000)}`);
  if ((offerText || "").trim()) known.push(`Offre/promotion actuelle déjà en place :\n${offerText.trim().slice(0, 1000)}`);
  if (rewardLabel) known.push(`Récompense de fidélité configurée : "${rewardLabel}" à ${rewardThreshold || 10} points.`);
  if (known.length > 0) {
    ctx += `\n\nCe que tu sais déjà sur ce commerce :\n${known.join("\n\n")}`;
  } else {
    ctx += `\n\nCe commerçant n'a pas encore renseigné son menu ni son offre — s'il ne les donne pas dans sa question, tu peux lui demander de les décrire ou de joindre une photo.`;
  }
  return ctx;
}

async function callGeminiChat({ systemPrompt, messages, file }) {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY manquant.");

  const contents = messages.map((m, i) => {
    const parts = [];
    const isLast = i === messages.length - 1;
    if (isLast && file && file.base64 && file.mimeType) {
      parts.push({ inline_data: { mime_type: file.mimeType, data: file.base64 } });
    }
    parts.push({ text: m.text.slice(0, 6000) });
    return { role: m.role === "assistant" ? "model" : "user", parts };
  });

  let lastFailure = null;
  for (const model of GEMINI_MODEL_CASCADE) {
    let res;
    try {
      res = await fetch(geminiUrlFor(model), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 1400 },
        }),
      });
    } catch (err) {
      lastFailure = { transient: true, networkError: true };
      continue;
    }

    if (res.ok) {
      const data = await res.json();
      const blockReason = data?.promptFeedback?.blockReason;
      if (blockReason) throw new Error("La question n'a pas pu être traitée (contenu refusé par le filtre IA).");
      const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
      if (!text.trim()) {
        lastFailure = { transient: true };
        continue;
      }
      return text.trim();
    }

    const body = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("Limite gratuite Gemini atteinte pour l'instant (quota par minute/jour).");
    if (res.status === 401 || res.status === 403 || (res.status === 400 && /API key/i.test(body))) {
      throw new Error("Clé GEMINI_API_KEY invalide ou refusée.");
    }
    if (res.status === 404 || res.status === 503 || res.status === 500) {
      lastFailure = { transient: true, status: res.status };
      continue;
    }
    throw new Error(`Échec du conseiller IA (${res.status}) : ${body.slice(0, 300)}`);
  }

  if (lastFailure && lastFailure.networkError) {
    throw new Error("Impossible de joindre Gemini (réseau).");
  }
  throw new Error("Le service Gemini est temporairement surchargé ou à quota.");
}

async function callGroqChat({ systemPrompt, messages, file }) {
  const apiKey = (process.env.GROQ_API_KEY || "").trim();
  if (!apiKey) throw new Error("GROQ_API_KEY manquant.");

  const isImage = file && file.base64 && file.mimeType && file.mimeType.startsWith("image/");
  const cascade = isImage ? GROQ_VISION_MODEL_CASCADE : GROQ_TEXT_MODEL_CASCADE;

  const chatMessages = [{ role: "system", content: systemPrompt }];
  messages.forEach((m, i) => {
    const isLast = i === messages.length - 1;
    if (isLast && isImage) {
      chatMessages.push({
        role: "user",
        content: [
          { type: "text", text: m.text.slice(0, 6000) },
          { type: "image_url", image_url: { url: `data:${file.mimeType};base64,${file.base64}` } },
        ],
      });
    } else {
      chatMessages.push({ role: m.role === "assistant" ? "assistant" : "user", content: m.text.slice(0, 6000) });
    }
  });

  let lastFailure = null;
  for (const model of cascade) {
    let res;
    try {
      res = await fetch(GROQ_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: chatMessages, temperature: 0.7, max_tokens: 1400 }),
      });
    } catch (err) {
      lastFailure = { transient: true, networkError: true };
      continue;
    }

    if (res.ok) {
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content || "";
      if (!text.trim()) {
        lastFailure = { transient: true };
        continue;
      }
      return text.trim();
    }

    const body = await res.text().catch(() => "");
    if (res.status === 401 || res.status === 403) throw new Error("Clé GROQ_API_KEY invalide ou refusée.");
    if (res.status === 404 || res.status === 429 || res.status === 503 || res.status === 500) {
      lastFailure = { transient: true, status: res.status };
      continue;
    }
    throw new Error(`Échec du conseiller IA (secours, ${res.status}) : ${body.slice(0, 300)}`);
  }

  if (lastFailure && lastFailure.networkError) {
    throw new Error("Impossible de joindre le service IA de secours (réseau).");
  }
  throw new Error("Le service IA de secours (Groq) est aussi temporairement surchargé ou à quota.");
}

// Filet de secours FINAL, garanti disponible : pas de vraie IA, mais une
// réponse toujours utile plutôt qu'un message d'erreur. Reprend les mêmes
// tips évergreens que l'ancienne analyse de menu par règles, reformulés en
// réponse conversationnelle.
function localAdvisorFallback({ menuText, rewardLabel, rewardThreshold }) {
  const hasMenu = (menuText || "").trim().length > 0;
  const lines = [
    "Je n'arrive pas à joindre l'IA pour l'instant (quota ou surcharge temporaire), donc voici quelques pistes générales en attendant — réessaie ta question dans quelques minutes pour une réponse vraiment sur-mesure.",
    "Formule du midi à prix réduit sur 2-3 plats phares de ta carte — attire les habitués du quartier en semaine.",
    "Offre \"lundi tranquille\" : une réduction sur ton plat signature pour remplir la salle en début de semaine.",
    `Débloquez "${rewardLabel || "votre récompense"}" à ${rewardThreshold || 10} points — mets une petite affiche en caisse pour donner envie de commencer la carte.`,
    "Mets ton plat le plus populaire en avant sur tes réseaux — c'est souvent lui qui donne le plus envie de venir.",
  ];
  if (!hasMenu) {
    lines.push("Astuce : enregistre ton menu plus haut (texte ou photo) pour que mes prochaines réponses citent tes propres plats et prix.");
  }
  return lines.join("\n\n");
}

/**
 * Point d'entrée unique du conseiller IA.
 * `messages` : historique complet [{role:"user"|"assistant", text}], le
 * dernier élément étant forcément le nouveau message du commerçant.
 * `file` : { base64, mimeType } optionnel, rattaché au DERNIER message.
 * `context` : { menuText, offerText, rewardLabel, rewardThreshold }.
 * Renvoie toujours { reply, provider, fallback? } — ne lève jamais
 * d'exception : la fonction appelante n'a donc jamais besoin de gérer un cas
 * d'échec total.
 */
export async function askAdvisor({ messages, file, context }) {
  const systemPrompt = buildSystemPrompt(context || {});
  const geminiConfigured = !!(process.env.GEMINI_API_KEY || "").trim();
  const groqConfigured = !!(process.env.GROQ_API_KEY || "").trim();

  if (geminiConfigured) {
    try {
      const reply = await callGeminiChat({ systemPrompt, messages, file });
      return { reply, provider: "gemini" };
    } catch (err) {
      console.error("Conseiller IA (Gemini) échoué, tentative Groq :", err.message);
    }
  }

  if (groqConfigured) {
    try {
      const reply = await callGroqChat({ systemPrompt, messages, file });
      return { reply, provider: "groq" };
    } catch (err) {
      console.error("Conseiller IA (Groq) échoué :", err.message);
    }
  }

  return { reply: localAdvisorFallback(context || {}), provider: "local", fallback: true };
}
