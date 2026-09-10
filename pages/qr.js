// Page utilitaire historique : générait un QR code pointant vers la racine
// du site. Devenu ambigu maintenant que Fidélions est multi-comptes (il n'y
// a plus "un seul" restaurant à la racine) — chaque commerçant a son propre
// QR/lien dans l'onglet "Partager" de son espace. On redirige donc ici.

export default function QrPage() {
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
