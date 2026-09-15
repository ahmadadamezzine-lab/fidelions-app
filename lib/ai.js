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
// (503/500) ou que son quota gratuit est dépassé, on retombe sur le
// suivant au lieu d'abandonner tout de suite. "gemini-pro-latest" est en
// PREMIER exprès (Adam a explicitement demandé la vraie qualité Gemini
// plutôt que d'économiser du quota) : c'est le modèle le plus capable
// pour élaborer de vraies stratégies réfléchies plutôt que des idées
// génériques. "gemini-flash-latest" en second recours (bonne qualité,
// plus rapide), et "gemini-flash-lite-latest" en tout dernier — le moins
// gourmand en quota, un filet de sécurité qui garantit qu'une analyse
// aboutit quand même si pro/flash sont tous les deux occupés ou à quota,
// plutôt que de retomber sur l'analyse basique. Ce sont des alias qui
// pointent toujours vers le modèle actuel de chaque gamme (au lieu d'un
// numéro de version figé) — les modèles Gemini sont retirés régulièrement
// (ex : gemini-2.0-flash a été arrêté mi-2026) — les alias évitent que
// cette fonctionnalité se casse toute seule au prochain retrait de modèle.
const GEMINI_MODEL_CASCADE = ["gemini-pro-latest", "gemini-flash-latest", "gemini-flash-lite-latest"];

function geminiUrlFor(model) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

const PROMPT = `Tu es un consultant en stratégie marketing et fidélisation, spécialisé dans la restauration indépendante. On te donne le menu d'un restaurant (texte, PDF, ou photo). Analyse-le et comprends son contenu par toi-même : type de cuisine, gamme de prix, plats à forte marge probable (boissons, desserts, accompagnements) vs plats d'appel, structure de la carte.

Réfléchis vraiment avant de répondre — ne sors pas des idées génériques interchangeables d'un restaurant à l'autre ("fais une promo", "offre une réduction"). Chaque suggestion doit être une vraie tactique, ancrée dans CE menu précis (cite de vrais noms de plats et prix), et doit combiner :
- des idées de campagnes/offres directement lançables (formule, happy hour, offre du jour, réduction ciblée...) ;
- des "tips cachés" — des leviers de psychologie comportementale et de fidélisation que la plupart des restaurateurs indépendants n'utilisent pas consciemment, par exemple : l'effet de progression acquise (un client qui démarre déjà à 2/10 tampons abandonne moins qu'un client à 0/10, même avec le même effort restant) ; l'aversion à la perte près du seuil (rappeler qu'il "manque 1 point" convertit mieux qu'annoncer "plus que 9 points") ; l'ancrage par une récompense phare très visible mais rare pour rendre les récompenses courantes plus attractives par comparaison ; le regroupement d'un plat à forte marge avec la récompense pour protéger la rentabilité ; le bon moment pour notifier (juste après le passage, ou juste avant une réouverture le lendemain) ; la rareté/urgence dosée (offre 48h) plutôt que permanente, qui perd son pouvoir d'incitation avec le temps.

Pour chaque tip cachée, commence le texte par "🔑 Tip caché — " pour qu'elle se distingue clairement d'une idée de campagne classique, et explique en une phrase POURQUOI ça marche (le mécanisme psychologique ou business), pas juste QUOI faire.

Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte avant ou après, au format exact :
{
  "items": [{"name": "nom du plat", "price": 12.5}],
  "suggestions": ["idée ou tip 1", "idée ou tip 2", "..."]
}
Règles :
- "items" : liste les plats/boissons/menus que tu identifies avec leur prix en euros (nombre, sans le symbole €). Ignore les lignes sans prix lisible.
- "suggestions" : 6 à 8 éléments, en alternant idées de campagnes concrètes et tips cachés (au moins 3 tips cachés parmi les 6-8). Chaque élément fait 2 à 4 phrases complètes (l'idée/le tip, pourquoi ça marche, comment l'exécuter concrètement avec ce menu) — pas des titres ni des phrases coupées. En français.
- Aucun texte en dehors du JSON.`;

// Schéma strict envoyé à Gemini (responseSchema, voir generationConfig
// plus bas) : au lieu de simplement DEMANDER du JSON dans le prompt (ce
// que Gemini peut mal respecter sur un long menu), on force le modèle à
// produire exactement cette forme — bien plus fiable qu'un simple prompt,
// et ça élimine tout texte parasite autour du JSON.
const MENU_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          price: { type: "NUMBER" },
        },
        required: ["name", "price"],
      },
    },
    suggestions: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
  },
  required: ["items", "suggestions"],
};

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
          generationConfig: {
            // Un peu plus de créativité que la valeur par défaut (0.4) —
            // on veut des stratégies variées et bien trouvées, pas la
            // réponse la plus "probable"/générique à chaque fois. Le
            // schéma strict (responseSchema, voir plus bas) garde la
            // FORME toujours propre même avec ce réglage plus créatif.
            temperature: 0.8,
            // maxOutputTokens doit couvrir DEUX choses qui partagent le
            // même budget chez Gemini : la réflexion interne (activée
            // ci-dessous, mais PLAFONNÉE — voir thinkingConfig) ET la
            // réponse finale (6-8 idées/tips de plusieurs phrases + la
            // liste des plats) — un vrai besoin d'environ 2000-2500
            // jetons, donc 4096 laisse une bonne marge sans excès. Un
            // budget total illimité (essayé un temps) consommait
            // beaucoup plus de jetons par requête qu'il n'en fallait
            // vraiment — sur le plan gratuit, ça mange le quota par
            // minute bien plus vite, ce qui déclenchait le "quota
            // dépassé" ressenti par Adam comme une régression. À
            // l'inverse, une valeur trop basse (1024, la toute première
            // version) recoupait le JSON en plein milieu. 4096 est le
            // compromis : largement au-dessus du vrai besoin, mais loin
            // du gaspillage d'un budget non plafonné.
            maxOutputTokens: 4096,
            // Réflexion activée mais PLAFONNÉE (thinkingBudget: 2048 /
            // thinkingLevel: "medium") plutôt que illimitée (-1 / "high",
            // essayé un temps) : Adam veut que l'IA réfléchisse vraiment
            // avant de répondre (pas d'idées génériques), mais une
            // réflexion sans limite peut consommer énormément de jetons
            // sur un menu complexe — exactement ce qui grignotait le
            // quota gratuit partagé par tous les commerces. Un budget de
            // réflexion fixe garde un vrai raisonnement, avec une
            // consommation prévisible d'une requête à l'autre. Les deux
            // champs coexistent pour couvrir toute la cascade ci-dessus
            // quel que soit le modèle réel derrière chaque alias.
            thinkingConfig: { thinkingBudget: 2048, thinkingLevel: "medium" },
            // JSON strict imposé par schéma (responseSchema) plutôt que
            // simplement demandé dans le prompt : Gemini ne peut plus
            // renvoyer un texte mal formé ou entouré de commentaires —
            // bien plus fiable sur un menu long ou une photo complexe.
            responseMimeType: "application/json",
            responseSchema: MENU_RESPONSE_SCHEMA,
          },
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
      if (attempt.status === 400 && /thinking|responseSchema|responseMimeType/i.test(attempt.body || "")) {
        // Un des alias de la cascade ne reconnaît pas un des nouveaux
        // champs de generationConfig ci-dessus (ex : un modèle sans
        // "réflexion" qui refuse thinkingConfig) : on essaie le modèle
        // suivant plutôt que de faire échouer toute l'analyse pour un
        // simple désaccord de champ sur UN SEUL modèle de la liste.
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
  // Limites relevées (200 → 600 caractères, 6 → 8 éléments) : le prompt
  // demande maintenant des stratégies et "tips cachés" développés en 2-4
  // phrases (voir PROMPT plus haut), pas des puces d'une ligne — l'ancienne
  // limite de 200 caractères aurait coupé ces explications en plein mot.
  const suggestions = Array.isArray(parsed.suggestions)
    ? parsed.suggestions.filter(Boolean).map((s) => String(s).slice(0, 600)).slice(0, 8)
    : [];

  if (items.length === 0 && suggestions.length === 0) {
    throw new Error("L'IA n'a rien trouvé d'exploitable dans ce document.");
  }

  return { items, suggestions };
}
