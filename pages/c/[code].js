// pages/c/[code].js
//
// Page que la carte physique NFC/QR ouvre réellement (voir lib/db.js,
// section "Cartes NFC/QR physiques", pour le pourquoi de cette
// indirection : le lot de cartes est imprimé avec un code générique,
// AVANT de savoir à quel commerçant il ira). Ici on regarde juste à quel
// commerçant ce code est relié aujourd'hui et on renvoie vers sa page
// d'inscription publique (/r/<slug>) — tout se joue côté serveur, avant
// que la page ne s'affiche, pour que le client ne voie jamais rien
// d'autre que la page du commerçant.
//
// Une carte pas encore vendue (générée mais jamais assignée dans
// /admin-cartes) affiche un message neutre plutôt qu'une erreur brute :
// ça peut arriver si un client scanne une carte qu'Adam a en stock mais
// n'a pas encore remise à un commerçant.

import { getCard } from "../../lib/db";

export default function CardRedirect({ status }) {
  const messages = {
    "not-found": "Cette carte n'est pas reconnue.",
    unassigned: "Cette carte n'est pas encore activée. Réessaie un peu plus tard.",
  };
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 24,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: "#444",
      }}
    >
      <p>{messages[status] || messages["not-found"]}</p>
    </div>
  );
}

export async function getServerSideProps({ params }) {
  const card = await getCard(params.code);

  if (!card) {
    return { props: { status: "not-found" } };
  }

  if (!card.merchantSlug) {
    return { props: { status: "unassigned" } };
  }

  return {
    redirect: {
      destination: `/r/${card.merchantSlug}`,
      permanent: false,
    },
  };
}
