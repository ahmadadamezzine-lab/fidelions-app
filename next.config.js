/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (isServer) {
      // tesseract.js (lecture de photo dans le navigateur pour l'analyse de
      // menu — voir ocrImageToText dans pages/commercant.js) n'est utilisé
      // QUE côté client, via un import() dynamique déclenché par un clic.
      // Next.js analyse quand même statiquement cet import() lors de la
      // compilation du bundle SERVEUR de la page (même s'il n'est jamais
      // exécuté côté serveur) — et tesseract.js embarque un script de
      // worker pensé pour Node qui fait planter cette compilation serveur
      // dans certains cas connus avec Next.js (voir
      // github.com/naptha/tesseract.js/issues/868). On l'exclut donc
      // explicitement du bundle serveur : aucun besoin d'y accéder côté
      // serveur de toute façon, et ça évite un build Vercel qui échoue
      // silencieusement en gardant l'ancienne version en ligne.
      config.externals = [...(config.externals || []), "tesseract.js"];
    }
    return config;
  },
};

module.exports = nextConfig;
