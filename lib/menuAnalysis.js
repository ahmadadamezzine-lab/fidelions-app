// lib/menuAnalysis.js
//
// Point d'entrée unique pour l'analyse IA du menu (voir
// pages/api/analyze-menu.js) : essaie Gemini en premier (lib/ai.js —
// qualité supérieure, demandée explicitement par Adam), et si ÇA ÉCHOUE
// POUR N'IMPORTE QUELLE RAISON (quota gratuit dépassé — le cas vécu par
// Adam, surcharge, clé absente...), retombe automatiquement sur Groq
// (lib/groq.js), qui héberge gratuitement des modèles à poids ouverts
// avec un quota totalement séparé de celui de Google. Adam n'a rien à
// choisir : ça "marche" tout simplement, avec la meilleure IA disponible
// à l'instant T.
//
// Si GEMINI_API_KEY n'est même pas configurée, on saute directement à
// Groq plutôt que d'échouer pour rien.

import { analyzeMenuWithAI } from "./ai";
import { analyzeMenuWithGroq } from "./groq";

export async function analyzeMenu({ text, file }) {
  const cleanText = (text || "").trim();
  if (!file && !cleanText) {
    throw new Error("Aucun contenu à analyser : écris ou importe un menu d'abord.");
  }

  const geminiConfigured = !!(process.env.GEMINI_API_KEY || "").trim();
  const groqConfigured = !!(process.env.GROQ_API_KEY || "").trim();

  let geminiError = null;
  if (geminiConfigured) {
    try {
      const result = await analyzeMenuWithAI({ text, file });
      return { ...result, provider: "gemini" };
    } catch (err) {
      geminiError = err;
      console.error("Analyse Gemini échouée, tentative avec le mode secours (Groq) :", err.message);
    }
  }

  if (!groqConfigured) {
    // Pas de filet de secours configuré : on renvoie l'erreur Gemini
    // telle quelle (ou, si Gemini n'était même pas configuré, un message
    // qui explique qu'AUCUNE des deux IA n'est prête).
    if (geminiError) throw geminiError;
    throw new Error(
      "Aucune IA n'est configurée : ajoute GEMINI_API_KEY et/ou GROQ_API_KEY dans les variables d'environnement Vercel (voir le README)."
    );
  }

  try {
    const result = await analyzeMenuWithGroq({ text, file });
    return { ...result, provider: "groq" };
  } catch (groqError) {
    // Les deux ont échoué : on montre les deux raisons plutôt que d'en
    // cacher une — utile notamment pour le cas PDF (Groq explique
    // pourquoi il ne peut pas prendre le relais dans ce cas précis).
    if (geminiError) {
      throw new Error(`${geminiError.message} Le mode secours a aussi échoué : ${groqError.message}`);
    }
    throw groqError;
  }
}
