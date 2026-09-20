// pages/sitemap.xml.js
//
// Sitemap XML minimal : liste les pages publiques et statiques du site
// marketing (pas les fiches /r/[slug] de chaque restaurant, ni bien sûr
// /commercant qui est privé — voir public/robots.txt). Suffisant pour
// qu'un moteur de recherche découvre vite les pages qui comptent
// (accueil, CGV, confidentialité), sans la complexité d'un sitemap
// généré dynamiquement à partir de la base de commerçants.
//
// Next.js (pages router) ne sert pas de XML nativement pour une route
// "page" classique : ce composant ne rend jamais rien côté client, il se
// contente d'écrire directement la réponse XML dans getServerSideProps
// puis de couper le rendu React avec `res.end()`.

const STATIC_PATHS = ["", "/cgv", "/confidentialite", "/mentions-legales"];

export async function getServerSideProps({ req, res }) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const baseUrl = `${proto}://${req.headers.host}`;

  const urls = STATIC_PATHS.map(
    (path) => `  <url><loc>${baseUrl}${path}</loc></url>`
  ).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;

  res.setHeader("Content-Type", "application/xml");
  res.write(xml);
  res.end();
  return { props: {} };
}

export default function Sitemap() {
  return null;
}
