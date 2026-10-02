// pages/index.js
//
// Page d'accueil MARKETING de Fidions — remplace l'ancienne redirection
// directe vers /commercant (gardée en mémoire ci-dessous). Adam a demandé
// une page dans la dynamique du concurrent "Fidelix" (fidelix.ma, captures
// fournies) : hero animé, bénéfices, calculateur de retour sur
// investissement, grille de fonctionnalités, étapes, tarifs, pied de page —
// avec des boutons qui bougent légèrement au survol. Les CTA renvoient vers
// /commercant (création de compte / connexion), qui reste le véritable
// point d'entrée applicatif — voir le useEffect sur router.query.mode dans
// pages/commercant.js.
//
// Les chiffres affichés (section "Pourquoi Fidions") sont des faits sur
// le produit lui-même (délai de mise en place, absence d'application à
// installer, etc.), pas des statistiques clients inventées — Fidions
// étant un service tout jeune, aucune fausse preuve sociale ("+10 000
// clients") n'est affichée.
//
// La section "stats-proof" (juste avant les tarifs) est différente : ce
// sont des chiffres sur la fidélisation client EN GÉNÉRAL, pas sur
// Fidions, chacun sourcé (Harvard Business Review, Bain & Company,
// étude SumUp France 2024) et vérifié avant publication — jamais les
// chiffres exacts d'un concurrent, toujours reformulés avec leur propre
// source citée.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Head from "next/head";
import { PRICING_TIERS, BILLING_CYCLES, getTierPrice } from "../lib/pricing";

// Titre/description/image affichés dans les résultats Google et les
// aperçus de lien partagé (WhatsApp, réseaux sociaux) — sans ça, un lien
// Fidions partagé n'affiche que l'URL nue, ce qui inspire moins
// confiance qu'une carte avec titre + accroche + logo.
const SEO_TITLE = "Fidions — Programme de fidélité sur Google & Apple Wallet";
const SEO_DESCRIPTION =
  "Carte de fidélité directement dans le portefeuille du téléphone de tes clients, sans application à installer. Mise en place en 2 minutes, dès 49€/mois.";
const SEO_IMAGE = "/logo.png";

const PURPLE = "#16A69C";
const CONTACT_EMAIL = "ahmadadamezzine@gmail.com";
const CONTACT_WHATSAPP = "33637177314";

// Permet de taper directement une valeur au clavier dans le calculateur ROI
// (en plus du curseur) — on ne bloque pas tant que le champ est vide ou en
// cours de frappe, on borne juste la valeur finale entre min et max.
function clampNum(raw, min, max) {
  if (raw === "") return min;
  const n = Number(raw);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

const ICONS = {
  bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6Z" />,
  wallet: <><rect x="3" y="6" width="18" height="13" rx="2.2" /><path d="M16 13h.01" /><path d="M3 9h18" /></>,
  gift: <><rect x="5.5" y="13" width="13" height="7" rx="1" /><rect x="4" y="9.3" width="16" height="3.7" rx="1" /><path d="M12 9.3V20" /><path d="M12 9.3c-1.3 0-2.6-.7-2.6-2.3S10.5 4 12 6.2C13.5 4 15.6 4.7 15.6 7S13.3 9.3 12 9.3Z" /></>,
  star: <path d="M12 3.5 14.6 9l6 .8-4.4 4.1 1.1 6-5.3-2.9L6.7 20l1.1-6-4.4-4.1 6-.8Z" />,
  apple: <><path d="M16.4 12.3c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.9-3-.8-1.5 0-3 .9-3.7 2.3-1.6 2.8-.4 6.9 1.1 9.2.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.2 0 2-1.1 2.8-2.2.9-1.3 1.2-2.5 1.2-2.6-.1 0-2.4-.9-2.4-3.8Z" /><path d="M12.4 6.2c.1-1.9 1.6-3.4 3.5-3.6.1 1.9-1.5 3.5-3.5 3.6Z" fill="currentColor" stroke="none" /></>,
  wifi: <><path d="M4.5 10.5a11 11 0 0 1 15 0" /><path d="M7.5 13.7a7 7 0 0 1 9 0" /><path d="M10.5 17a3 3 0 0 1 3 0" /><path d="M12 20h.01" /><path d="M3 4 21 20" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.3" /><path d="M15.3 14a5 5 0 0 1 5.5 5" /></>,
  chart: <><rect x="4" y="12" width="3.4" height="8" /><rect x="10.3" y="7" width="3.4" height="13" /><rect x="16.6" y="3" width="3.4" height="17" /></>,
  mappin: <><path d="M12 21s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12Z" /><circle cx="12" cy="9" r="2.4" /></>,
  megaphone: <><path d="M4 11v3.5a1.3 1.3 0 0 0 1.3 1.3H7l1.3 3.7a1.4 1.4 0 0 0 2.6-.5v-3.2" /><path d="M4 11h3l10-5.5v14L7 14.5H4a1 1 0 0 1-1-1V12a1 1 0 0 1 1-1Z" /><path d="M20 9a5.5 5.5 0 0 1 0 7.5" /></>,
  palette: <><path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 2-2s-.7-1.4-.7-2.2c0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8Z" /><circle cx="7.5" cy="10.5" r="1" /><circle cx="10.5" cy="7" r="1" /><circle cx="15" cy="8" r="1" /></>,
  trophy: <><path d="M8 4h8v4a4 4 0 0 1-8 0Z" /><path d="M8 5H5v2a3 3 0 0 0 3 3M16 5h3v2a3 3 0 0 1-3 3" /><path d="M12 12v3" /><path d="M9 20h6" /><path d="M10 17h4l.6 3H9.4Z" /></>,
  building: <><rect x="5" y="3" width="10" height="18" /><path d="M9 21v-4h2v4" /><path d="M8 7h1M8 10h1M8 13h1M11 7h1M11 10h1M11 13h1" /><path d="M15 10h4v11h-4" /></>,
  robot: <><rect x="5" y="8" width="14" height="10" rx="2.3" /><path d="M12 8V5" /><circle cx="12" cy="4" r="1.1" /><circle cx="9" cy="13" r="1.1" /><circle cx="15" cy="13" r="1.1" /><path d="M9 17h6" /></>,
  check: <path d="M5 12.5 10 17 19 7" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  qr: <><rect x="4" y="4" width="6" height="6" /><rect x="14" y="4" width="6" height="6" /><rect x="4" y="14" width="6" height="6" /><path d="M14 14h3v3h-3zM19 14v6M14 19h6" /></>,
  nfc: <><rect x="3" y="5" width="13" height="14" rx="2.3" /><path d="M18 9a4 4 0 0 1 0 6" /><path d="M20.7 7a7.5 7.5 0 0 1 0 10" /></>,
};

function Icon({ name, size = 20 }) {
  const d = ICONS[name];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d}
    </svg>
  );
}

// Déclenche une seule fois quand l'élément entre dans le viewport — sert au
// compteur animé (facts, stats) et aux apparitions au scroll, sans dépendance
// externe. Respecte prefers-reduced-motion : un utilisateur qui l'a activé
// voit directement l'état final, jamais l'animation.
function useInView(threshold = 0.4) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, inView];
}

// Comparatif "Sans/Avec" par paires : chaque point du problème (gauche,
// sombre) est directement apparié à sa solution (droite, émeraude) au même
// index. Survoler ou toucher une ligne met en valeur sa paire des DEUX
// côtés à la fois — un vrai effet interactif qui montre la transformation
// point par point, sans dépendre d'un glissé (fragile sur du texte, et pas
// le bon outil pour comparer deux listes plutôt que deux images).
function PairedCompare({ pairs }) {
  const [active, setActive] = useState(null);
  return (
    <div className="pair-compare">
      <div className="pair-col pair-col-before">
        <h3>Sans Fidions</h3>
        <ul>
          {pairs.map((p, i) => (
            <li
              key={p.before}
              className={active === i ? "pair-active" : active !== null ? "pair-dim" : ""}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              tabIndex={0}
            >
              {p.before}
            </li>
          ))}
        </ul>
      </div>
      <div className="pair-col pair-col-after">
        <h3>Avec Fidions</h3>
        <ul>
          {pairs.map((p, i) => (
            <li
              key={p.after}
              className={active === i ? "pair-active" : active !== null ? "pair-dim" : ""}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              tabIndex={0}
            >
              <Icon name="check" size={16} /> {p.after}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Anime un nombre entier de 0 jusqu'à `value` une fois l'élément visible.
// Le préfixe/suffixe (ex: "min", "€") reste statique autour du nombre animé.
function CountUp({ value, duration = 900, prefix = "", suffix = "" }) {
  const [ref, inView] = useInView(0.5);
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value, duration]);
  return (
    <span ref={ref}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

const FEATURES = [
  {
    icon: "wallet",
    title: "Google Wallet & Apple Wallet",
    desc: "Ajoutée en un geste au portefeuille du téléphone de ton client — aucune application à télécharger.",
    wallets: [
      { name: "Google Wallet", status: "ready" },
      { name: "Apple Wallet", status: "soon" },
    ],
  },
  { icon: "gift", title: "Points ou tampons", desc: "Choisis la mécanique de fidélité qui correspond à ton commerce, avec des paliers de récompense sur mesure." },
  { icon: "star", title: "Donnez votre avis, gagnez des points", desc: "Un bouton \"avis Google\" directement sur la carte de tes clients, avec un bonus de points à la clé — tu récoltes plus d'avis, ils sont récompensés.", badge: "Nouveau" },
  { icon: "wifi", title: "Mode sans connexion", desc: "L'écran de scan employé continue de fonctionner même sans réseau, et se synchronise ensuite.", badge: "Nouveau" },
  { icon: "palette", title: "Personnalisation complète", desc: "Logo, couleur, bannière : ta carte à tes couleurs, en quelques clics." },
  { icon: "mappin", title: "Notifications de proximité", desc: "Une notification native envoyée quand un client passe près de chez toi." },
  { icon: "chart", title: "Statistiques en temps réel", desc: "Fréquentation, points distribués, récompenses — tout ton programme en un coup d'œil." },
  { icon: "megaphone", title: "Campagnes ciblées", desc: "Envoie des offres et des annonces directement sur la carte de tes clients." },
  { icon: "trophy", title: "Équipe & classement", desc: "Gère les accès de tes employés et suis un classement des plus fidélisants." },
  { icon: "building", title: "Fiche établissement", desc: "Horaires, réseaux, photos : une vitrine publique pour ton commerce." },
  { icon: "robot", title: "Assistant IA menu", desc: "Analyse ton menu et suggère des offres pertinentes pour fidéliser." },
  { icon: "qr", title: "Lien & QR code de partage", desc: "Un lien unique et un QR code à afficher en caisse ou sur les tables : tes clients ajoutent leur carte en un scan." },
];

const COMPARE_PAIRS = [
  { before: "Des cartes en papier perdues ou oubliées", after: "Une carte toujours dans le téléphone du client" },
  { before: "Aucune idée de qui sont tes clients réguliers", after: "Une base de clients fidélisés, consultable à tout moment" },
  { before: "Pas de moyen de les recontacter", after: "Des campagnes et notifications en un clic" },
  { before: "Les avis Google restent rares", after: "Un bonus qui encourage les avis Google" },
];

const STEPS = [
  { n: "1", icon: "building", title: "Crée ton compte", desc: "Nom, logo, mécanique de fidélité : ton espace est prêt en 2 minutes." },
  { n: "2", icon: "palette", title: "Personnalise ta carte", desc: "Couleurs, récompenses, notifications : configure ton programme comme tu le souhaites." },
  { n: "3", icon: "qr", title: "Partage ton lien", desc: "QR code ou lien direct : tes clients ajoutent leur carte et reviennent, automatiquement." },
];

// 3 faits, pas plus : le 4e ("+3 pts pour un avis Google") a été retiré —
// ce nombre de points est réglable par chaque commerçant (onglet
// Notifications/Campagnes), donc ce n'était plus toujours vrai. Pas de
// remplacement pour garder exactement 3 idées, comme demandé.
const PRODUCT_FACTS = [
  { number: 2, suffix: " min", label: "pour créer ta carte de fidélité" },
  { number: 0, suffix: " appli", label: "à faire installer à tes clients" },
  { number: 49, suffix: " €", label: "par mois, sans engagement, dès 1 point de vente" },
];

// 4 statistiques vérifiées avant publication (voir le commentaire en tête
// de fichier) — sur la fidélisation client en général, pas sur Fidions.
// Les deux stats SumUp (67% reviennent dans la même enseigne / 68% dépensent
// plus que prévu près d'une récompense) sont volontairement regroupées en
// une seule ("près de 70%") plutôt que présentées comme deux chiffres à
// part — elles viennent de la même étude et racontent la même idée. Le
// principe de Pareto (4e carte) est un principe économique général du
// domaine public (Vilfredo Pareto, 19e siècle), pas le chiffre propre
// d'une étude ou d'un concurrent — safe à citer tel quel.
const STATS_PROOF = [
  {
    value: "5 à 25x",
    label: "plus cher d'acquérir un nouveau client que de fidéliser un client existant",
    source: "Harvard Business Review",
  },
  {
    value: "+25 à 95%",
    label: "de bénéfices pour seulement 5% de clients fidélisés en plus",
    source: "Bain & Company",
  },
  {
    value: "Près de 70%",
    label: "des clients reviennent plus souvent et dépensent plus que prévu grâce à un programme de fidélité",
    source: "SumUp, étude France 2024",
  },
  {
    value: "80/20",
    label: "vos 20% de clients les plus fidèles pèsent souvent 80% de votre chiffre d'affaires",
    source: "Principe de Pareto",
  },
];

export default function Home() {
  const [clientsParJour, setClientsParJour] = useState(40);
  const [panierMoyen, setPanierMoyen] = useState(18);
  const [joursOuverture, setJoursOuverture] = useState(26);
  const [gainPct, setGainPct] = useState(10);
  const [billingCycle, setBillingCycle] = useState("mensuel");

  const baseTier = PRICING_TIERS.find((t) => t.id === "1") || PRICING_TIERS[0];

  const roi = useMemo(() => {
    const clients = Math.max(0, Number(clientsParJour) || 0);
    const panier = Math.max(0, Number(panierMoyen) || 0);
    const jours = Math.max(0, Number(joursOuverture) || 0);
    const gain = Math.max(0, Number(gainPct) || 0) / 100;
    // Estimation indicative, entièrement pilotée par les curseurs : le
    // curseur « gain de fréquentation » est l'hypothèse — prudente par
    // défaut (10%) — plutôt qu'un pourcentage caché dans le calcul (ce
    // n'est pas une donnée mesurée sur de vrais clients Fidions, le
    // service étant récent).
    const caSupp = clients * jours * panier * gain;
    // Coût pris en compte : le tarif annuel engagé (le moins cher), pour donner
    // l'estimation de retour sur investissement la plus favorable — clairement
    // annoté ci-dessous comme "engagement 1 an" pour rester honnête vis-à-vis
    // du tarif mensuel sans engagement (49€), affiché dans la grille tarifaire.
    const cout = getTierPrice(baseTier, "annuel") || 0;
    const beneficeNet = caSupp - cout;
    return {
      caSupp: Math.round(caSupp),
      cout,
      beneficeNet: Math.round(beneficeNet),
      roiMultiple: cout > 0 ? Math.round(caSupp / cout) : null,
      annuel: Math.round(beneficeNet * 12),
    };
  }, [clientsParJour, panierMoyen, joursOuverture, gainPct, baseTier]);

  return (
    <div className="home">
      <Head>
        <title>{SEO_TITLE}</title>
        <meta name="description" content={SEO_DESCRIPTION} />
        <meta property="og:title" content={SEO_TITLE} />
        <meta property="og:description" content={SEO_DESCRIPTION} />
        <meta property="og:image" content={SEO_IMAGE} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
      </Head>
      <nav className="nav">
        <div className="nav-inner">
          <Link href="/" className="nav-brand">
            <img src="/logo.png" alt="Fidions" />
            <span>Fidions</span>
          </Link>
          <div className="nav-links">
            <a href="#fonctionnalites">Fonctionnalités</a>
            <a href="#comment-ca-marche">Comment ça marche</a>
            <a href="#tarifs">Tarifs</a>
          </div>
          <div className="nav-cta">
            <Link href="/commercant?mode=login" className="nav-login">Se connecter</Link>
            <Link href="/commercant?mode=signup" className="btn btn-primary btn-sm">Créer mon compte</Link>
          </div>
        </div>
      </nav>

      <header className="hero">
        <div className="hero-inner">
          <div className="hero-text">
            <h1>
              La carte de fidélité que vos clients gardent vraiment dans leur poche
            </h1>
            <p className="hero-sub">
              Fidions transforme tes clients de passage en habitués : carte digitale, points ou tampons,
              notifications et statistiques, sans aucune application à faire installer.
            </p>
            <div className="hero-cta">
              <Link href="/commercant?mode=signup" className="btn btn-primary btn-lg">
                Créer mon compte gratuitement
              </Link>
              <a href="#comment-ca-marche" className="btn btn-ghost btn-lg">
                Voir comment ça marche
              </a>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="mock-phone-back">
              <div className="mock-phone-shell">
                <div className="mock-phone-notch" />
                <div className="mock-pass">
                  <div className="mock-pass-top">
                    <div className="mock-pass-logo" />
                    <span>Fidions</span>
                  </div>
                  <div className="mock-pass-banner" />
                  <div className="mock-pass-body">
                    <div className="mock-pass-row">
                      <span>CARTE DE</span>
                      <span>RÉCOMPENSE</span>
                    </div>
                    <div className="mock-pass-row mock-pass-row-strong">
                      <span>Thomas</span>
                      <span>-20% sur l'addition</span>
                    </div>
                    <div className="mock-pass-qr">
                      <Icon name="qr" size={46} />
                    </div>
                    <div className="mock-pass-caption">4/6 tampons</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mock-phone">
              <div className="mock-card">
                <div className="mock-card-top">
                  <div className="mock-logo" />
                  <span className="mock-points">128 pts</span>
                </div>
                <div className="mock-card-bars">
                  <span style={{ width: "80%" }} />
                </div>
                <div className="mock-card-footer">Encore 2 visites avant ta récompense</div>
              </div>
              <div className="mock-notif">
                <Icon name="star" size={15} /> Récompense débloquée !
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="facts">
        <div className="section-inner facts-grid">
          {PRODUCT_FACTS.map((f) => (
            <div className="fact" key={f.label}>
              <span className="fact-value">
                <CountUp value={f.number} suffix={f.suffix} />
              </span>
              <span className="fact-label">{f.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="compare">
        <div className="section-inner">
          <h2 className="section-title">Sans fidélisation, tu perds des clients sans le savoir</h2>
          <p className="section-sub">Survole un point pour voir sa transformation.</p>
          <PairedCompare pairs={COMPARE_PAIRS} />
        </div>
      </section>

      <section className="calculator">
        <div className="section-inner">
          <h2 className="section-title">Combien Fidions peut vous rapporter</h2>
          <p className="section-sub">
            Une estimation à partir de vos propres chiffres. Ajustez, comparez, décidez.
          </p>
          <div className="calc-box">
            <div className="calc-card calc-card-inputs">
              <h3>Vos chiffres</h3>
              <p className="calc-card-sub">Ajustez les curseurs à votre réalité.</p>

              <div className="calc-slider-row">
                <div className="calc-slider-label">
                  <span>Clients accueillis chaque jour</span>
                  <span className="calc-num-wrap">
                    <input
                      type="number"
                      className="calc-num-input"
                      min="0"
                      max="2000"
                      value={clientsParJour}
                      onChange={(e) => setClientsParJour(clampNum(e.target.value, 0, 2000))}
                    />
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="200"
                  value={Math.min(clientsParJour, 200)}
                  onChange={(e) => setClientsParJour(e.target.value)}
                />
              </div>

              <div className="calc-slider-row">
                <div className="calc-slider-label">
                  <span>Ticket moyen par visite</span>
                  <span className="calc-num-wrap">
                    <input
                      type="number"
                      className="calc-num-input"
                      min="0"
                      max="1000"
                      value={panierMoyen}
                      onChange={(e) => setPanierMoyen(clampNum(e.target.value, 0, 1000))}
                    />
                    <span className="calc-num-suffix">€</span>
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={Math.min(panierMoyen, 100)}
                  onChange={(e) => setPanierMoyen(e.target.value)}
                />
              </div>

              <div className="calc-slider-row">
                <div className="calc-slider-label">
                  <span>Jours d'activité dans le mois</span>
                  <span className="calc-num-wrap">
                    <input
                      type="number"
                      className="calc-num-input"
                      min="0"
                      max="31"
                      value={joursOuverture}
                      onChange={(e) => setJoursOuverture(clampNum(e.target.value, 0, 31))}
                    />
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="31"
                  value={Math.min(joursOuverture, 31)}
                  onChange={(e) => setJoursOuverture(e.target.value)}
                />
              </div>

              <div className="calc-slider-row">
                <div className="calc-slider-label">
                  <span>Hausse de fréquentation estimée</span>
                  <span className="calc-num-wrap">
                    <input
                      type="number"
                      className="calc-num-input"
                      min="0"
                      max="100"
                      value={gainPct}
                      onChange={(e) => setGainPct(clampNum(e.target.value, 0, 100))}
                    />
                    <span className="calc-num-suffix">%</span>
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={Math.min(gainPct, 30)}
                  onChange={(e) => setGainPct(e.target.value)}
                />
              </div>

              <p className="calc-hint">
                Une carte comme la vôtre fait en général revenir vos clients 5 à 20 % plus souvent
                (source : rapport annuel Paytronix sur la fidélité client en restauration).
                Choisissez une estimation prudente.
              </p>
            </div>

            <div className="calc-card calc-card-result">
              <span className="calc-result-tag">Estimation</span>
              <p className="calc-result-heading">Chiffre d'affaires additionnel</p>
              <div className="calc-result-big">
                {roi.caSupp.toLocaleString("fr-FR")} € <span>/ mois</span>
              </div>
              <div className="calc-result-rows">
                <div className="calc-result-row">
                  <span>Coût Fidions</span>
                  <strong>{roi.cout} € / mois</strong>
                </div>
                <div className="calc-result-row">
                  <span>Bénéfice net</span>
                  <strong className="calc-positive">
                    {roi.beneficeNet >= 0 ? "+" : ""}
                    {roi.beneficeNet.toLocaleString("fr-FR")} €
                  </strong>
                </div>
                <div className="calc-result-row">
                  <span>Retour sur investissement</span>
                  <strong>{roi.roiMultiple != null ? `×${roi.roiMultiple}` : "—"}</strong>
                </div>
              </div>
              <p className="calc-result-fine">
                Coût calculé sur la formule annuelle avec engagement 1 an (29 €/mois) — 49 €/mois sans engagement.
              </p>
              <div className="calc-result-annual">
                Sur une année, cela représente
                <strong>
                  {roi.annuel >= 0 ? "+" : ""}
                  {roi.annuel.toLocaleString("fr-FR")} €
                </strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="features" id="fonctionnalites">
        <div className="section-inner">
          <h2 className="section-title">Tout ce qu'il faut pour fidéliser, dans un seul outil</h2>
          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div
                className={`feature-card${i === 0 ? " feature-card-lead" : ""}${f.badge ? " feature-card-new" : ""}`}
                key={f.title}
              >
                <div className="feature-icon">
                  <Icon name={f.icon} size={22} />
                </div>
                {f.badge && <span className="feature-tag">{f.badge}</span>}
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                {f.wallets && (
                  <div className="feature-wallets">
                    {f.wallets.map((w) => (
                      <span
                        key={w.name}
                        className={`wallet-tag${w.status === "soon" ? " wallet-tag-soon" : ""}`}
                      >
                        {w.name} · {w.status === "soon" ? "bientôt" : "disponible"}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="steps" id="comment-ca-marche">
        <div className="section-inner">
          <h2 className="section-title">En 3 étapes, ton programme de fidélité est en ligne</h2>
          <div className="steps-grid">
            {STEPS.map((s) => (
              <div className="step-card" key={s.n}>
                <div className="step-head">
                  <span className="step-number">{s.n}</span>
                  <span className="step-icon"><Icon name={s.icon} size={18} /></span>
                </div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="stats-proof">
        <div className="section-inner">
          <span className="stats-proof-eyebrow">Pas une intuition, des chiffres</span>
          <h2 className="stats-proof-title">La fidélité fait toute la différence</h2>
          <p className="stats-proof-sub">
            Ce ne sont pas nos chiffres : ce sont ceux de la recherche sur la fidélisation client.
          </p>
          <div className="stats-proof-grid">
            {STATS_PROOF.map((s) => (
              <div className="stat-proof-card" key={s.label}>
                <span className="stat-proof-value">{s.value}</span>
                <p className="stat-proof-label">{s.label}</p>
                <span className="stat-proof-source">{s.source}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pricing" id="tarifs">
        <div className="section-inner">
          <h2 className="section-title">Un tarif simple, qui grandit avec toi</h2>
          <p className="section-sub">Système de fidélisation clé en main, sans engagement de durée sur la formule mensuelle.</p>
          <div className="billing-toggle">
            {BILLING_CYCLES.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`billing-option${billingCycle === c.id ? " active" : ""}`}
                onClick={() => setBillingCycle(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="pricing-grid">
            {PRICING_TIERS.map((tier) => {
              const price = getTierPrice(tier, billingCycle);
              return (
                <div className="price-card" key={tier.id}>
                  <h3>{tier.label}</h3>
                  <p className="price-desc">{tier.desc}</p>
                  <div className="price-value">
                    {price != null ? (
                      <>
                        <span className="price-number">{price} €</span>
                        <span className="price-suffix">{BILLING_CYCLES.find((c) => c.id === billingCycle).suffix}</span>
                      </>
                    ) : (
                      <span className="price-number price-devis">Sur devis</span>
                    )}
                  </div>
                  <Link href="/commercant?mode=signup" className="btn btn-secondary">
                    Commencer
                  </Link>
                </div>
              );
            })}
          </div>

          <div className="pricing-addon">
            <div className="pricing-addon-icon" aria-hidden="true">
              <Icon name="nfc" size={26} />
            </div>
            <div className="pricing-addon-text">
              <h3>Ta carte NFC & QR code à poser en caisse</h3>
              <p>
                Tes clients approchent leur téléphone ou scannent le QR code : leur carte de
                fidélité s'ajoute en 2 secondes, sans QR à chercher ni application à installer.
              </p>
            </div>
            <div className="pricing-addon-cta">
              <span className="pricing-addon-price">
                20 €<span className="pricing-addon-price-suffix">paiement unique</span>
              </span>
              <Link href="/commander-carte" className="btn btn-secondary">
                Commander la mienne
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-banner">
        <div className="section-inner cta-banner-inner">
          <h2>Tes clients reviennent, automatiquement, sans que tu y penses.</h2>
          <p>Crée ton compte gratuitement et personnalise ta carte en quelques minutes.</p>
          <Link href="/commercant?mode=signup" className="btn btn-primary btn-lg">
            Créer mon compte
          </Link>
        </div>
      </section>

      <footer className="footer">
        <div className="section-inner footer-top">
          <div className="footer-brand-col">
            <div className="footer-brand">
              <img src="/logo.png" alt="Fidions" />
              <span>Fidions</span>
            </div>
            <p className="footer-tagline">
              Le système de fidélisation clé en main pour les commerces qui veulent que leurs
              clients reviennent.
            </p>
            <div className="footer-contact">
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              <span> · </span>
              <a href={`https://wa.me/${CONTACT_WHATSAPP}`} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            </div>
          </div>

          <div className="footer-nav-col">
            <span className="footer-col-title">Produit</span>
            <a href="#fonctionnalites">Fonctionnalités</a>
            <a href="#tarifs">Tarifs</a>
            <a href="#comment-ca-marche">Comment ça marche</a>
          </div>

          <div className="footer-nav-col">
            <span className="footer-col-title">Légal</span>
            <Link href="/mentions-legales">Mentions légales</Link>
            <Link href="/cgv">CGV</Link>
            <Link href="/confidentialite">Confidentialité</Link>
          </div>
        </div>

        <div className="footer-divider" />

        <div className="section-inner footer-bottom">
          <div className="footer-payments">
            <span className="footer-payments-label">Paiement de l'abonnement sécurisé via Stripe</span>
            <div className="payment-badges">
              <span className="payment-badge">Carte bancaire</span>
              <span className="payment-badge">Apple Pay</span>
              <span className="payment-badge">Google Pay</span>
              <span className="payment-badge">Prélèvement SEPA</span>
            </div>
          </div>
          <div className="footer-bottom-row">
            <p className="footer-copyright">© {new Date().getFullYear()} Fidions. Tous droits réservés.</p>
            <span className="footer-madein">Fait en France avec passion</span>
          </div>
        </div>
      </footer>

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
  .home {
    font-family: "Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #111114;
    background: #fff;
    overflow-x: hidden;
  }
  .section-inner {
    max-width: 1080px;
    margin: 0 auto;
    padding: 0 24px;
  }
  .section-title {
    font-size: 26px;
    text-align: center;
    margin: 0 0 12px;
    color: #111114;
  }
  .section-sub {
    text-align: center;
    color: #666;
    font-size: 14.5px;
    margin: 0 0 32px;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border-radius: 12px;
    font-weight: 700;
    text-decoration: none;
    cursor: pointer;
    border: none;
    transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
    white-space: nowrap;
  }
  .btn:hover {
    transform: translateY(-2px);
  }
  .btn:active {
    transform: translateY(0);
  }
  .btn-primary {
    background: linear-gradient(135deg, ${PURPLE} 0%, #0F8C82 100%);
    color: #fff;
    box-shadow: 0 4px 14px rgba(22, 166, 156, 0.3);
  }
  .btn-primary:hover {
    box-shadow: 0 8px 22px rgba(22, 166, 156, 0.4);
  }
  .btn-secondary {
    background: #E8F5F3;
    color: ${PURPLE};
    padding: 12px 30px;
    border-radius: 999px;
  }
  .btn-secondary:hover {
    background: ${PURPLE};
    color: #fff;
  }
  .btn-ghost {
    background: #fff;
    color: #111114;
    border: 1.5px solid #e0e0e0;
  }
  .btn-ghost:hover {
    border-color: ${PURPLE};
    color: ${PURPLE};
  }
  .btn-lg {
    padding: 15px 26px;
    font-size: 15px;
  }
  .btn-sm {
    padding: 9px 16px;
    font-size: 13px;
  }

  .nav {
    position: sticky;
    top: 0;
    background: rgba(255,255,255,0.92);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid #eee;
    z-index: 20;
  }
  .nav-inner {
    max-width: 1080px;
    margin: 0 auto;
    padding: 14px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .nav-brand {
    display: flex;
    align-items: center;
    gap: 8px;
    text-decoration: none;
    color: ${PURPLE};
    font-weight: 800;
    font-size: 16px;
    flex: none;
  }
  .nav-brand img {
    width: 30px;
    height: 30px;
    border-radius: 8px;
  }
  .nav-links {
    display: flex;
    gap: 26px;
    flex: 1;
    justify-content: center;
  }
  .nav-links a {
    color: #444;
    text-decoration: none;
    font-size: 13.5px;
    font-weight: 600;
    transition: color 0.15s ease;
  }
  .nav-links a:hover {
    color: ${PURPLE};
  }
  .nav-cta {
    display: flex;
    align-items: center;
    gap: 14px;
    flex: none;
  }
  .nav-login {
    color: #444;
    text-decoration: none;
    font-size: 13.5px;
    font-weight: 600;
  }
  .nav-login:hover {
    color: ${PURPLE};
  }

  .hero {
    background:
      radial-gradient(900px 500px at 85% -10%, rgba(22, 166, 156, 0.22), transparent 60%),
      radial-gradient(700px 400px at -5% 100%, rgba(15, 140, 130, 0.14), transparent 55%),
      #111114;
    padding: 88px 0 64px;
  }
  .hero-inner {
    max-width: 1080px;
    margin: 0 auto;
    padding: 0 24px;
    display: flex;
    align-items: center;
    gap: 48px;
  }
  .hero-text {
    flex: 1.1;
    min-width: 0;
  }
  .hero h1 {
    font-size: 40px;
    line-height: 1.16;
    letter-spacing: -0.01em;
    margin: 0 0 18px;
    color: #fff;
  }
  .hero-sub {
    font-size: 16px;
    line-height: 1.6;
    color: #B8BCB8;
    margin: 0 0 28px;
    max-width: 520px;
  }
  .hero-cta {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
  }

  .hero-visual {
    position: relative;
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    min-width: 260px;
    min-height: 300px;
  }
  .mock-phone {
    position: relative;
    width: 260px;
    z-index: 2;
    transform: translate(-22px, -16px);
    animation: float 4s ease-in-out infinite;
  }
  @keyframes float {
    0%, 100% { transform: translate(-22px, -16px); }
    50% { transform: translate(-22px, -26px); }
  }
  .mock-phone-back {
    position: absolute;
    top: 34px;
    right: -32px;
    width: 168px;
    z-index: 1;
    transform: rotate(9deg);
    animation: floatBack 5s ease-in-out infinite;
  }
  @keyframes floatBack {
    0%, 100% { transform: rotate(9deg) translateY(0); }
    50% { transform: rotate(9deg) translateY(8px); }
  }
  .mock-phone-shell {
    background: #111114;
    border-radius: 26px;
    padding: 8px;
    box-shadow: 0 25px 55px rgba(10, 10, 12, 0.3);
  }
  .mock-phone-notch {
    width: 46px;
    height: 12px;
    background: #111114;
    border-radius: 0 0 8px 8px;
    margin: 0 auto;
  }
  .mock-pass {
    background: #fff;
    border-radius: 16px;
    overflow: hidden;
  }
  .mock-pass-top {
    background: linear-gradient(160deg, ${PURPLE} 0%, #0F8C82 100%);
    color: #fff;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 9px 12px;
    font-size: 10px;
    font-weight: 800;
  }
  .mock-pass-logo {
    width: 16px;
    height: 16px;
    border-radius: 5px;
    background: rgba(255,255,255,0.35);
  }
  .mock-pass-banner {
    height: 54px;
    background: linear-gradient(135deg, #E8F5F3, #CBEAE2);
  }
  .mock-pass-body {
    padding: 10px 12px 14px;
  }
  .mock-pass-row {
    display: flex;
    justify-content: space-between;
    font-size: 8px;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .mock-pass-row-strong {
    font-size: 11px;
    font-weight: 800;
    color: #111114;
    text-transform: none;
    letter-spacing: 0;
    margin: 4px 0 10px;
  }
  .mock-pass-qr {
    display: flex;
    justify-content: center;
    color: ${PURPLE};
    background: #F1EFE8;
    border-radius: 8px;
    padding: 8px 0 4px;
  }
  .mock-pass-caption {
    text-align: center;
    font-size: 9px;
    color: #999;
    margin-top: 4px;
    font-weight: 700;
  }
  .mock-card {
    background: linear-gradient(160deg, ${PURPLE} 0%, #0F8C82 100%);
    border-radius: 20px;
    padding: 22px;
    color: #fff;
    box-shadow: 0 20px 50px rgba(22, 166, 156, 0.35);
  }
  .mock-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 18px;
  }
  .mock-logo {
    width: 34px;
    height: 34px;
    border-radius: 9px;
    background: rgba(255,255,255,0.25);
  }
  .mock-points {
    font-weight: 800;
    font-size: 15px;
  }
  .mock-card-bars {
    height: 8px;
    border-radius: 999px;
    background: rgba(255,255,255,0.25);
    overflow: hidden;
    margin-bottom: 12px;
  }
  .mock-card-bars span {
    display: block;
    height: 100%;
    background: #fff;
    border-radius: 999px;
  }
  .mock-card-footer {
    font-size: 12px;
    opacity: 0.9;
  }
  .mock-notif {
    position: absolute;
    bottom: -18px;
    right: -18px;
    background: #fff;
    color: #111114;
    border-radius: 12px;
    padding: 10px 14px;
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 6px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.15);
  }
  .mock-notif svg {
    color: #f5a623;
  }

  .facts {
    background: #0A0A0C;
    padding: 32px 0;
  }
  .facts-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    text-align: center;
  }
  .fact {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .fact-value {
    color: #fff;
    font-size: 22px;
    font-weight: 800;
  }
  .fact-label {
    color: #8FD6CC;
    font-size: 12px;
  }

  .stats-proof {
    background: #0A0A0C;
    padding: 56px 0 72px;
  }
  .stats-proof-eyebrow {
    display: block;
    width: fit-content;
    margin: 0 auto 16px;
    color: ${PURPLE};
    font-weight: 700;
    font-style: italic;
    font-size: 13.5px;
  }
  .stats-proof-title {
    color: #fff;
    font-size: 34px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    text-align: center;
    margin: 0 0 12px;
  }
  .stats-proof-sub {
    color: #8FD6CC;
    text-align: center;
    font-size: 14.5px;
    margin: 0 auto 40px;
    max-width: 540px;
  }
  .stats-proof-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 18px;
  }
  .stat-proof-card {
    background: #1A1B1F;
    border: 1px solid #2A2B30;
    border-radius: 16px;
    padding: 24px 18px;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 10px;
    transition: transform 0.15s ease, border-color 0.15s ease;
  }
  .stat-proof-card:hover {
    transform: translateY(-4px);
    border-color: #3A3B40;
  }
  .stat-proof-value {
    color: ${PURPLE};
    font-size: 34px;
    font-weight: 800;
  }
  .stat-proof-label {
    color: #B8BCB8;
    font-size: 12.5px;
    margin: 0;
    line-height: 1.45;
  }
  .stat-proof-source {
    color: #B8BCB8;
    font-size: 11px;
    margin-top: auto;
    padding-top: 4px;
  }

  .compare {
    padding: 72px 0;
  }
  .pair-compare {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2px;
    margin-top: 28px;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 20px 50px rgba(0,0,0,0.1);
  }
  .pair-col {
    padding: 32px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .pair-col-before {
    background: #2A2B30;
  }
  .pair-col-after {
    background: linear-gradient(160deg, #111114 0%, #0F8C82 130%);
  }
  .pair-col h3 {
    margin: 0 0 16px;
    font-size: 18px;
    color: #fff;
  }
  .pair-col ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 340px;
  }
  .pair-col li {
    border-radius: 12px;
    padding: 10px 12px;
    margin: 0 -12px;
    transition: background-color 0.2s ease, opacity 0.2s ease, transform 0.2s ease;
    cursor: default;
  }
  .pair-col-before li {
    font-size: 14px;
    color: #B8BCB8;
    padding-left: 30px;
    position: relative;
  }
  .pair-col-before li::before {
    content: "–";
    position: absolute;
    left: 12px;
    color: #6b6e6b;
  }
  .pair-col-after li {
    font-size: 14px;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .pair-col-after li svg {
    color: #8FD6CC;
    flex: none;
  }
  .pair-col li.pair-active {
    background: rgba(255,255,255,0.08);
    transform: translateX(2px);
  }
  .pair-col-before li.pair-active {
    color: #fff;
  }
  .pair-col-before li.pair-active::before {
    color: #8FD6CC;
  }
  .pair-col li.pair-dim {
    opacity: 0.4;
  }

  .calculator {
    background: #F1EFE8;
    padding: 72px 0;
  }
  .calc-box {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    align-items: stretch;
  }
  .calc-card {
    border-radius: 18px;
    padding: 26px;
  }
  .calc-card-inputs {
    background: #fff;
    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
  }
  .calc-card-inputs h3 {
    margin: 0 0 4px;
    font-size: 16px;
  }
  .calc-card-sub {
    margin: 0 0 20px;
    font-size: 12.5px;
    color: #8a8a8a;
  }
  .calc-slider-row {
    margin-bottom: 20px;
  }
  .calc-slider-label {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 13px;
    font-weight: 700;
    color: #333;
    margin-bottom: 8px;
  }
  .calc-slider-label strong {
    color: ${PURPLE};
    font-size: 14px;
  }
  .calc-num-wrap {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    background: #F1EFE8;
    border: 1px solid #F1EFE8;
    border-radius: 8px;
    padding: 2px 6px;
  }
  .calc-num-input {
    width: 48px;
    border: none;
    background: transparent;
    color: ${PURPLE};
    font-size: 14px;
    font-weight: 700;
    font-family: inherit;
    text-align: right;
    -moz-appearance: textfield;
  }
  .calc-num-input::-webkit-outer-spin-button,
  .calc-num-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .calc-num-input:focus {
    outline: none;
  }
  .calc-num-suffix {
    color: ${PURPLE};
    font-size: 13px;
    font-weight: 700;
  }
  .calc-slider-row input[type="range"] {
    width: 100%;
    -webkit-appearance: none;
    appearance: none;
    height: 5px;
    border-radius: 999px;
    background: #F1EFE8;
    outline: none;
  }
  .calc-slider-row input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${PURPLE};
    box-shadow: 0 2px 6px rgba(22, 166, 156, 0.4);
    cursor: pointer;
  }
  .calc-slider-row input[type="range"]::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border: none;
    border-radius: 50%;
    background: ${PURPLE};
    box-shadow: 0 2px 6px rgba(22, 166, 156, 0.4);
    cursor: pointer;
  }
  .calc-hint {
    font-size: 11.5px;
    color: #999;
    line-height: 1.5;
    margin: 4px 0 0;
  }
  .calc-card-result {
    background: #0A0A0C;
    color: #fff;
    display: flex;
    flex-direction: column;
  }
  .calc-result-tag {
    align-self: flex-start;
    background: rgba(255,255,255,0.12);
    color: #CBEAE2;
    font-size: 10.5px;
    font-weight: 800;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    padding: 4px 10px;
    border-radius: 999px;
    margin-bottom: 14px;
  }
  .calc-result-heading {
    margin: 0 0 4px;
    font-size: 12.5px;
    color: #8FD6CC;
  }
  .calc-result-big {
    font-size: 32px;
    font-weight: 800;
    margin-bottom: 18px;
  }
  .calc-result-big span {
    font-size: 14px;
    font-weight: 600;
    color: #8FD6CC;
  }
  .calc-result-rows {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-top: 14px;
    border-top: 1px solid rgba(255,255,255,0.12);
    margin-bottom: 18px;
  }
  .calc-result-row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: #CBEAE2;
  }
  .calc-result-row strong {
    color: #fff;
  }
  .calc-positive {
    color: #4ade80 !important;
  }
  .calc-result-fine {
    font-size: 10.5px;
    color: #B8BCB8;
    line-height: 1.5;
    margin: -8px 0 14px;
  }
  .calc-result-annual {
    margin-top: auto;
    background: linear-gradient(135deg, ${PURPLE} 0%, #0F8C82 100%);
    border-radius: 12px;
    padding: 14px 16px;
    font-size: 12.5px;
    color: #F1EFE8;
    line-height: 1.5;
  }
  .calc-result-annual strong {
    display: block;
    font-size: 19px;
    color: #fff;
    margin-top: 2px;
  }
  .pricing-addon {
    margin-top: 32px;
    background: #F1EFE8;
    border: 1.5px solid #CBEAE2;
    border-radius: 16px;
    padding: 22px 24px;
    display: flex;
    align-items: center;
    gap: 20px;
  }
  .pricing-addon-icon {
    flex: none;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: #E8F5F3;
    color: ${PURPLE};
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .pricing-addon-text {
    flex: 1;
    min-width: 0;
  }
  .pricing-addon-text h3 {
    font-size: 14.5px;
    margin: 0 0 4px;
    color: #111114;
  }
  .pricing-addon-text p {
    font-size: 12.5px;
    color: #777;
    margin: 0;
    line-height: 1.5;
  }
  .pricing-addon-cta {
    flex: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .pricing-addon-price {
    font-size: 20px;
    font-weight: 800;
    color: #111114;
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1.2;
  }
  .pricing-addon-price-suffix {
    font-size: 10.5px;
    font-weight: 600;
    color: #8a8a8a;
  }
  .pricing-addon .btn {
    white-space: nowrap;
  }

  .features {
    padding: 72px 0;
  }
  .features-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 18px;
    margin-top: 32px;
  }
  .feature-card {
    position: relative;
    background: #F1EFE8;
    border: 1.5px solid #F1EFE8;
    border-radius: 16px;
    padding: 22px;
    transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  }
  .feature-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 28px rgba(0,0,0,0.08);
    border-color: #CBEAE2;
  }
  .feature-card-lead {
    grid-column: span 2;
    background: #111114;
    border-color: #111114;
  }
  .feature-card-lead:hover {
    border-color: #2A2B30;
  }
  .feature-card-lead .feature-icon {
    background: rgba(255,255,255,0.1);
    color: #16A69C;
  }
  .feature-card-lead h3,
  .feature-card-lead p {
    color: #fff;
  }
  .feature-card-lead p {
    color: #B8BCB8;
  }
  .feature-card-new {
    background: #E8F5F3;
    border-color: #E8F5F3;
  }
  .feature-card-new:hover {
    border-color: #CBEAE2;
  }
  .feature-tag {
    display: inline-block;
    color: #0F8C82;
    font-size: 10.5px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    margin-bottom: 4px;
  }
  .feature-icon {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    background: #E8F5F3;
    color: ${PURPLE};
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
    flex: none;
  }
  .feature-card h3 {
    font-size: 15px;
    margin: 0 0 6px;
  }
  .feature-card p {
    font-size: 12.5px;
    color: #777;
    line-height: 1.5;
    margin: 0;
  }
  .feature-wallets {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 12px;
  }
  .wallet-tag {
    font-size: 10.5px;
    font-weight: 700;
    color: #16A34A;
    background: #ecfdf3;
    border: 1px solid #cdf3dc;
    padding: 4px 9px;
    border-radius: 999px;
  }
  .wallet-tag-soon {
    color: ${PURPLE};
    background: #E8F5F3;
    border-color: #CBEAE2;
  }

  .steps {
    background: #0A0A0C;
    padding: 72px 0;
  }
  .steps .section-title {
    color: #fff;
  }
  .steps-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 22px;
    margin-top: 32px;
  }
  .step-card {
    background: rgba(255,255,255,0.06);
    border-radius: 16px;
    padding: 24px;
    transition: transform 0.15s ease, background 0.15s ease;
  }
  .step-card:hover {
    transform: translateY(-4px);
    background: rgba(255,255,255,0.1);
  }
  .step-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }
  .step-number {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: ${PURPLE};
    color: #fff;
    font-weight: 800;
  }
  .step-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: rgba(255,255,255,0.08);
    color: #CBEAE2;
  }
  .step-card h3 {
    color: #fff;
    font-size: 15px;
    margin: 0 0 8px;
  }
  .step-card p {
    color: #CBEAE2;
    font-size: 13px;
    line-height: 1.5;
    margin: 0;
  }

  .pricing {
    padding: 72px 0;
  }
  .billing-toggle {
    display: flex;
    justify-content: center;
    gap: 6px;
    background: #F1EFE8;
    border-radius: 10px;
    padding: 4px;
    max-width: 360px;
    margin: 0 auto 32px;
  }
  .billing-option {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    background: none;
    border: none;
    color: #595959;
    padding: 9px 8px;
    font-size: 12.5px;
    font-weight: 700;
    border-radius: 8px;
    cursor: pointer;
  }
  .billing-option.active {
    background: #fff;
    color: ${PURPLE};
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }
  .pricing-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
  .price-card {
    border: 1.5px solid #eee;
    border-radius: 16px;
    padding: 22px;
    display: flex;
    flex-direction: column;
    transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  }
  .price-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 28px rgba(0,0,0,0.08);
    border-color: #CBEAE2;
  }
  .price-card h3 {
    font-size: 14.5px;
    margin: 0 0 6px;
  }
  .price-desc {
    font-size: 12px;
    color: #8a8a8a;
    margin: 0 0 16px;
    min-height: 32px;
  }
  .price-value {
    margin-bottom: 18px;
    display: flex;
    flex-direction: column;
  }
  .price-number {
    font-size: 26px;
    font-weight: 800;
    color: #111114;
  }
  .price-devis {
    font-size: 18px;
  }
  .price-suffix {
    font-size: 11px;
    color: #8a8a8a;
  }
  .price-card .btn {
    /* La carte "Sur devis" n'a qu'une ligne de prix (pas de "/mois"), donc
       sans ça son bouton remonte et casse l'alignement avec les 3 autres
       cartes — on colle toujours le bouton en bas de la carte. */
    margin-top: auto;
    /* Bouton recentré (plus étiré sur toute la largeur de la carte) et
       complètement arrondi façon pilule. */
    align-self: center;
  }

  .cta-banner {
    background: linear-gradient(160deg, ${PURPLE} 0%, #0F8C82 100%);
    padding: 64px 0;
    text-align: center;
  }
  .cta-banner-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
  }
  .cta-banner h2 {
    color: #fff;
    font-size: 26px;
    margin: 0;
  }
  .cta-banner p {
    color: #CBEAE2;
    font-size: 14.5px;
    margin: 0 0 8px;
  }
  .cta-banner .btn-primary {
    background: #fff;
    color: ${PURPLE};
  }

  .footer {
    background: #0A0A0C;
    padding: 56px 0 0;
  }
  .footer-top {
    display: flex;
    justify-content: space-between;
    gap: 40px;
    padding-bottom: 40px;
  }
  .footer-brand-col {
    flex: 1.4;
    min-width: 220px;
  }
  .footer-brand {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 800;
    color: #fff;
    font-size: 15px;
    margin-bottom: 12px;
  }
  .footer-brand img {
    width: 26px;
    height: 26px;
    border-radius: 7px;
  }
  .footer-tagline {
    color: #B8BCB8;
    font-size: 13px;
    line-height: 1.6;
    margin: 0 0 12px;
    max-width: 300px;
  }
  .footer-contact {
    font-size: 12.5px;
  }
  .footer-contact a {
    color: #CBEAE2;
    text-decoration: none;
    font-weight: 600;
  }
  .footer-nav-col {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 140px;
  }
  .footer-col-title {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #8FD6CC;
    margin-bottom: 4px;
  }
  .footer-nav-col a {
    color: #8FD6CC;
    text-decoration: none;
    font-size: 13.5px;
  }
  .footer-nav-col a:hover {
    color: #fff;
  }

  .footer-divider {
    border-top: 1px solid rgba(255,255,255,0.08);
  }

  .footer-bottom {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 24px 0 28px;
  }
  .footer-payments {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }
  .footer-payments-label {
    font-size: 11.5px;
    color: #B8BCB8;
  }
  .payment-badges {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }
  .payment-badge {
    font-size: 11.5px;
    font-weight: 700;
    color: #CBEAE2;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.14);
    padding: 5px 12px;
    border-radius: 999px;
  }
  .footer-bottom-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    width: 100%;
  }
  .footer-copyright {
    font-size: 11.5px;
    color: #B8BCB8;
    margin: 0;
  }
  .footer-madein {
    font-size: 11.5px;
    color: #B8BCB8;
  }

  @media (max-width: 900px) {
    .nav-links { display: none; }
    .hero-inner { flex-direction: column; }
    .hero h1 { font-size: 28px; }
    .hero-visual { margin-top: 32px; min-height: 260px; }
    .facts-grid { grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .pair-compare { grid-template-columns: 1fr; }
    .pair-col { padding: 24px; }
    .features-grid { grid-template-columns: repeat(2, 1fr); }
    .steps-grid { grid-template-columns: 1fr; }
    .pricing-grid { grid-template-columns: repeat(2, 1fr); }
    .calc-box { grid-template-columns: 1fr; }
    .pricing-addon { flex-direction: column; text-align: center; }
    .footer-top { flex-direction: column; gap: 28px; }
    .footer-bottom-row { flex-direction: column; text-align: center; }
  }
  @media (max-width: 560px) {
    .features-grid { grid-template-columns: 1fr; }
    .pricing-grid { grid-template-columns: 1fr; }
    .facts-grid { grid-template-columns: 1fr; }
    .stats-proof-grid { grid-template-columns: 1fr; }
    /* Sur téléphone, le hero-visual devient trop étroit pour poser les deux
       "3D phones" côte à côte sans qu'ils se chevauchent et deviennent
       illisibles (voir capture Adam) — on garde seulement la carte du
       dessus, bien centrée, sans le décalage prévu pour laisser la place à
       la deuxième derrière. */
    .mock-phone-back { display: none; }
    .mock-phone {
      width: 240px;
      transform: none;
      animation: floatMobile 4s ease-in-out infinite;
    }
  }
  @keyframes floatMobile {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
`;
