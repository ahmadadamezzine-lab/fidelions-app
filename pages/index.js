// pages/index.js
//
// Ancienne page d'accueil : formulaire d'inscription pour "le" restaurant
// (mode mono-compte). Devenue obsolète maintenant que Fidélions est
// multi-comptes — chaque restaurant a sa propre page d'inscription client
// à son propre lien (pages/r/[slug].js). La racine du site devient donc
// l'entrée des commerçants eux-mêmes : création de compte / connexion
// (pages/commercant.js).

export default function Home() {
  return null;
}

export async function getServerSideProps() {
  return {
    redirect: {
      destination: "/commercant",
      permanent: false,
    },
  };
}
