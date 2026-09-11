// pages/index.js
//
// Page d'accueil MARKETING de Fidélions — remplace l'ancienne redirection
// directe vers /commercant (gardée en mémoire ci-dessous). Adam a demandé
// une page dans la dynamique du concurrent "Fidelix" (fidelix.ma, captures
// fournies) : hero animé, bénéfices, calculateur de retour sur
// investissement, grille de fonctionnalités, étapes, tarifs, pied de page —
// avec des boutons qui bougent légèrement au survol. Les CTA renvoient vers
// /commercant (création de compte / connexion), qui reste le véritable
// point d'entrée applicatif — voir le useEffect sur router.query.mode dans
// pages/commercant.js.
//
// Les chiffres affichés (section "Pourquoi Fidélions") sont des faits sur
// le produit lui-même (délai de mise en place, absence d'application à
// installer, etc.), pas des statistiques clients inventées — Fidélions
// étant un service tout jeune, aucune fausse preuve sociale ("+10 000
// clients") n'est affichée.

import { useMemo, useState } from "react";
import Link from "next/link";
import { PRICING_TIERS, BILLING_CYCLES, getTierPrice } from "../lib/pricing";

const PURPLE = "#7414F4";
const CONTACT_EMAIL = "ahmadadamezzine@gmail.com";
const CONTACT_WHATSAPP = "33637177314";

const ICONS = {
  bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6Z" />,
  wallet: <><rect x="3" y="6" width="18" height="13" rx="2.2" /><path d="M16 13h.01" /><path d="M3 9h18" /></>,
  gift: <><rect x="5.5" y="13" width="13" height="7" rx="1" /><rect x="4" y="9.3" width="16" height="3.7" rx="1" /><path d="M12 9.3V20" /></>,
  star: <path d="M12 3.5 14.6 9l6 .8-4.4 4.1 1.1 6-5.3-2.9L6.7 20l1.1-6-4.4-4.1 6-.8Z" />,
  apple: <path d="M16.4 12.3c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.9-3-.8-1.5 0-3 .9-3.7 2.3-1.6 2.8-.4 6.9 1.1 9.2.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.2 0 2-1.1 2.8-2.2.9-1.3 1.2-2.5 1.2-2.6-.1 0-2.4-.9-2.4-3.8Z" />,
  wifi: <><path d="M4.5 10.5a11 11 0 0 1 15 0" /><path d="M7.5 13.7a7 7 0 0 1 9 0" /><path d="M10.5 17a3 3 0 0 1 3 0" /><path d="M12 20h.01" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.3" /><path d="M15.3 14a5 5 0 0 1 5.5 5" /></>,
  chart: <><rect x="4" y="12" width="3.4" height="8" /><rect x="10.3" y="7" width="3.4" height="13" /><rect x="16.6" y="3" width="3.4" height="17" /></>,
  mappin: <><path d="M12 21s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12Z" /><circle cx="12" cy="9" r="2.4" /></>,
  megaphone: <><path d="M3 10v4h3l7 4V6l-7 4Z" /><path d="M17 9a4 4 0 0 1 0 6" /></>,
  palette: <><path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 2-2s-.7-1.4-.7-2.2c0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8Z" /><circle cx="7.5" cy="10.5" r="1" /><circle cx="10.5" cy="7" r="1" /><circle cx="15" cy="8" r="1" /></>,
  trophy: <><path d="M8 4h8v4a4 4 0 0 1-8 0Z" /><path d="M8 5H5v2a3 3 0 0 0 3 3M16 5h3v2a3 3 0 0 1-3 3" /><path d="M12 12v3" /><path d="M9 20h6" /><path d="M10 17h4l.6 3H9.4Z" /></>,
  building: <><rect x="5" y="3" width="10" height="18" /><path d="M9 21v-4h2v4" /><path d="M8 7h1M8 10h1M8 13h1M11 7h1M11 10h1M11 13h1" /><path d="M15 10h4v11h-4" /></>,
  robot: <><rect x="5" y="8" width="14" height="10" rx="2.3" /><path d="M12 8V5" /><circle cx="12" cy="4" r="1.1" /><circle cx="9" cy="13" r="1.1" /><circle cx="15" cy="13" r="1.1" /><path d="M9 17h6" /></>,
  check: <path d="M5 12.5 10 17 19 7" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  qr: <><rect x="4" y="4" width="6" height="6" /><rect x="14" y="4" width="6" height="6" /><rect x="4" y="14" width="6" height="6" /><path d="M14 14h3v3h-3zM19 14v6M14 19h6" /></>,
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
];

const STEPS = [
  { n: "1", title: "Crée ton compte", desc: "Nom, logo, mécanique de fidélité : ton espace est prêt en 2 minutes." },
  { n: "2", title: "Personnalise ta carte", desc: "Couleurs, récompenses, notifications : configure ton programme comme tu le souhaites." },
  { n: "3", title: "Partage ton lien", desc: "QR code ou lien direct : tes clients ajoutent leur carte et reviennent, automatiquement." },
];

const PRODUCT_FACTS = [
  { value: "2 min", label: "pour créer ta carte de fidélité" },
  { value: "+3 pts", label: "offerts automatiquement pour un avis Google laissé" },
  { value: "0 appli", label: "à faire installer à tes clients" },
  { value: "49 €", label: "par mois, sans engagement, dès 1 point de vente" },
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
    // n'est pas une donnée mesurée sur de vrais clients Fidélions, le
    // service étant récent).
    const caSupp = clients * jours * panier * gain;
    const cout = getTierPrice(baseTier, "mensuel") || 0;
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
      <nav className="nav">
        <div className="nav-inner">
          <Link href="/" className="nav-brand">
            <img src="/logo.png" alt="Fidélions" />
            <span>Fidélions</span>
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
            <span className="eyebrow">Fidélisation client</span>
            <h1>
              Le système de fidélisation clé en main pour les commerces qui veulent que leurs clients reviennent
            </h1>
            <p className="hero-sub">
              Fidélions transforme tes clients de passage en habitués : carte digitale, points ou tampons,
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
                    <span>Fidélions</span>
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
              <span className="fact-value">{f.value}</span>
              <span className="fact-label">{f.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="compare">
        <div className="section-inner">
          <h2 className="section-title">Sans fidélisation, tu perds des clients sans le savoir</h2>
          <div className="compare-grid">
            <div className="compare-col compare-before">
              <h3>Sans Fidélions</h3>
              <ul>
                <li>Des cartes en papier perdues ou oubliées</li>
                <li>Aucune idée de qui sont tes clients réguliers</li>
                <li>Pas de moyen de les recontacter</li>
                <li>Les avis Google restent rares</li>
              </ul>
            </div>
            <div className="compare-col compare-after">
              <h3>Avec Fidélions</h3>
              <ul>
                <li><Icon name="check" size={16} /> Une carte toujours dans le téléphone du client</li>
                <li><Icon name="check" size={16} /> Une base de clients fidélisés, consultable à tout moment</li>
                <li><Icon name="check" size={16} /> Des campagnes et notifications en un clic</li>
                <li><Icon name="check" size={16} /> Un bonus qui encourage les avis Google</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="calculator">
        <div className="section-inner">
          <span className="calc-eyebrow">Faites le calcul</span>
          <h2 className="section-title">Combien Fidélions peut vous rapporter</h2>
          <p className="section-sub">
            Une estimation à partir de vos propres chiffres. Ajustez, comparez, décidez.
          </p>
          <div className="calc-box">
            <div className="calc-card calc-card-inputs">
              <h3>Vos chiffres</h3>
              <p className="calc-card-sub">Ajustez les curseurs à votre réalité.</p>

              <div className="calc-slider-row">
                <div className="calc-slider-label">
                  <span>Nombre de clients par jour</span>
                  <strong>{clientsParJour}</strong>
                </div>
                <input
                  type="range"
                  min="1"
                  max="200"
                  value={clientsParJour}
                  onChange={(e) => setClientsParJour(e.target.value)}
                />
              </div>

              <div className="calc-slider-row">
                <div className="calc-slider-label">
                  <span>Panier moyen par client</span>
                  <strong>{panierMoyen} €</strong>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={panierMoyen}
                  onChange={(e) => setPanierMoyen(e.target.value)}
                />
              </div>

              <div className="calc-slider-row">
                <div className="calc-slider-label">
                  <span>Jours d'ouverture par mois</span>
                  <strong>{joursOuverture}</strong>
                </div>
                <input
                  type="range"
                  min="1"
                  max="31"
                  value={joursOuverture}
                  onChange={(e) => setJoursOuverture(e.target.value)}
                />
              </div>

              <div className="calc-slider-row">
                <div className="calc-slider-label">
                  <span>Gain de fréquentation grâce à la fidélité</span>
                  <strong>{gainPct} %</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={gainPct}
                  onChange={(e) => setGainPct(e.target.value)}
                />
              </div>

              <p className="calc-hint">
                Les programmes de fidélité augmentent en général le chiffre d'affaires de 5 à 20 %. Le
                curseur « gain » vous laisse choisir une hypothèse prudente.
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
                  <span>Coût Fidélions</span>
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
            {FEATURES.map((f) => (
              <div className="feature-card" key={f.title}>
                {f.badge && <span className="feature-badge">{f.badge}</span>}
                <div className="feature-icon">
                  <Icon name={f.icon} size={22} />
                </div>
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
                <span className="step-number">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
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
          <p className="pricing-footnote">
            Support de caisse premium avec ton QR code : 20 €, en paiement unique.
          </p>
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
              <img src="/logo.png" alt="Fidélions" />
              <span>Fidélions</span>
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
            <span className="footer-payments-label">Paiement de l'abonnement sécurisé via Revolut</span>
            <div className="payment-badges">
              <span className="payment-badge">Revolut</span>
              <span className="payment-badge">Apple Pay</span>
              <span className="payment-badge">Carte bancaire</span>
            </div>
          </div>
          <div className="footer-bottom-row">
            <p className="footer-copyright">© {new Date().getFullYear()} Fidélions. Tous droits réservés.</p>
            <span className="footer-madein">Fait en France</span>
          </div>
        </div>
      </footer>

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
  .home {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #1a1a1a;
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
    color: #1a1a1a;
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
    background: ${PURPLE};
    color: #fff;
    box-shadow: 0 4px 14px rgba(116, 20, 244, 0.3);
  }
  .btn-primary:hover {
    box-shadow: 0 8px 22px rgba(116, 20, 244, 0.4);
  }
  .btn-secondary {
    background: #f3ecff;
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
    color: #1a1a1a;
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
    background: linear-gradient(180deg, #faf8ff 0%, #fff 65%);
    padding: 64px 0 40px;
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
  .eyebrow {
    display: inline-block;
    background: #f3ecff;
    color: ${PURPLE};
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.02em;
    padding: 6px 12px;
    border-radius: 999px;
    margin-bottom: 18px;
  }
  .hero h1 {
    font-size: 38px;
    line-height: 1.18;
    margin: 0 0 18px;
    color: #14101f;
  }
  .hero-sub {
    font-size: 16px;
    line-height: 1.6;
    color: #555;
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
    right: -4px;
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
    background: #1a1a1a;
    border-radius: 26px;
    padding: 8px;
    box-shadow: 0 25px 55px rgba(20, 16, 31, 0.3);
  }
  .mock-phone-notch {
    width: 46px;
    height: 12px;
    background: #1a1a1a;
    border-radius: 0 0 8px 8px;
    margin: 0 auto;
  }
  .mock-pass {
    background: #fff;
    border-radius: 16px;
    overflow: hidden;
  }
  .mock-pass-top {
    background: linear-gradient(160deg, ${PURPLE} 0%, #4a0ba3 100%);
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
    background: linear-gradient(135deg, #f3ecff, #e6d9ff);
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
    color: #1a1a1a;
    text-transform: none;
    letter-spacing: 0;
    margin: 4px 0 10px;
  }
  .mock-pass-qr {
    display: flex;
    justify-content: center;
    color: ${PURPLE};
    background: #faf9fd;
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
    background: linear-gradient(160deg, ${PURPLE} 0%, #4a0ba3 100%);
    border-radius: 20px;
    padding: 22px;
    color: #fff;
    box-shadow: 0 20px 50px rgba(116, 20, 244, 0.35);
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
    color: #1a1a1a;
    border-radius: 12px;
    padding: 10px 14px;
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 6px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.15);
  }
  .mock-notif :global(svg) {
    color: #f5a623;
  }

  .facts {
    background: #14101f;
    padding: 32px 0;
  }
  .facts-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
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
    color: #b8aee0;
    font-size: 12px;
  }

  .compare {
    padding: 72px 0;
  }
  .compare-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    margin-top: 32px;
  }
  .compare-col {
    border-radius: 16px;
    padding: 26px;
  }
  .compare-before {
    background: #faf9f9;
    border: 1.5px solid #eee;
  }
  .compare-after {
    background: #f6f1ff;
    border: 1.5px solid #e6d9ff;
  }
  .compare-col h3 {
    margin: 0 0 16px;
    font-size: 15px;
  }
  .compare-before h3 { color: #8a8a8a; }
  .compare-after h3 { color: ${PURPLE}; }
  .compare-col ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .compare-before li {
    font-size: 13.5px;
    color: #777;
    padding-left: 18px;
    position: relative;
  }
  .compare-before li::before {
    content: "–";
    position: absolute;
    left: 0;
    color: #bbb;
  }
  .compare-after li {
    font-size: 13.5px;
    color: #333;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .compare-after li :global(svg) {
    color: ${PURPLE};
    flex: none;
  }

  .calculator {
    background: #faf9fd;
    padding: 72px 0;
  }
  .calc-eyebrow {
    display: block;
    text-align: center;
    color: ${PURPLE};
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin-bottom: 8px;
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
  .calc-slider-row input[type="range"] {
    width: 100%;
    -webkit-appearance: none;
    appearance: none;
    height: 5px;
    border-radius: 999px;
    background: #ece4fb;
    outline: none;
  }
  .calc-slider-row input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${PURPLE};
    box-shadow: 0 2px 6px rgba(116, 20, 244, 0.4);
    cursor: pointer;
  }
  .calc-slider-row input[type="range"]::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border: none;
    border-radius: 50%;
    background: ${PURPLE};
    box-shadow: 0 2px 6px rgba(116, 20, 244, 0.4);
    cursor: pointer;
  }
  .calc-hint {
    font-size: 11.5px;
    color: #999;
    line-height: 1.5;
    margin: 4px 0 0;
  }
  .calc-card-result {
    background: #14101f;
    color: #fff;
    display: flex;
    flex-direction: column;
  }
  .calc-result-tag {
    align-self: flex-start;
    background: rgba(255,255,255,0.12);
    color: #cfc6e8;
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
    color: #b8aee0;
  }
  .calc-result-big {
    font-size: 32px;
    font-weight: 800;
    margin-bottom: 18px;
  }
  .calc-result-big span {
    font-size: 14px;
    font-weight: 600;
    color: #b8aee0;
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
    color: #cfc6e8;
  }
  .calc-result-row strong {
    color: #fff;
  }
  .calc-positive {
    color: #4ade80 !important;
  }
  .calc-result-annual {
    margin-top: auto;
    background: linear-gradient(135deg, ${PURPLE} 0%, #4a0ba3 100%);
    border-radius: 12px;
    padding: 14px 16px;
    font-size: 12.5px;
    color: #f0eaff;
    line-height: 1.5;
  }
  .calc-result-annual strong {
    display: block;
    font-size: 19px;
    color: #fff;
    margin-top: 2px;
  }
  .pricing-footnote {
    text-align: center;
    font-size: 12px;
    color: #8a8a8a;
    margin: 24px 0 0;
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
    background: #faf9fd;
    border: 1.5px solid #f0edf8;
    border-radius: 16px;
    padding: 22px;
    transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  }
  .feature-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 28px rgba(0,0,0,0.08);
    border-color: #e6d9ff;
  }
  .feature-badge {
    position: absolute;
    top: 14px;
    right: 14px;
    background: ${PURPLE};
    color: #fff;
    font-size: 10px;
    font-weight: 800;
    padding: 3px 8px;
    border-radius: 999px;
  }
  .feature-icon {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    background: #f3ecff;
    color: ${PURPLE};
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
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
    background: #f3ecff;
    border-color: #e6d9ff;
  }

  .steps {
    background: #14101f;
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
    margin-bottom: 14px;
  }
  .step-card h3 {
    color: #fff;
    font-size: 15px;
    margin: 0 0 8px;
  }
  .step-card p {
    color: #cfc6e8;
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
    background: #f3f0fa;
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
    border-color: #e6d9ff;
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
    color: #1a1a1a;
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
    background: linear-gradient(160deg, ${PURPLE} 0%, #4a0ba3 100%);
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
    color: #e6d9ff;
    font-size: 14.5px;
    margin: 0 0 8px;
  }
  .cta-banner .btn-primary {
    background: #fff;
    color: ${PURPLE};
  }

  .footer {
    background: #0d0a15;
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
    color: #948bb0;
    font-size: 13px;
    line-height: 1.6;
    margin: 0 0 12px;
    max-width: 300px;
  }
  .footer-contact {
    font-size: 12.5px;
  }
  .footer-contact a {
    color: #cfc6e8;
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
    color: #6b6280;
    margin-bottom: 4px;
  }
  .footer-nav-col :global(a) {
    color: #b8aee0;
    text-decoration: none;
    font-size: 13.5px;
  }
  .footer-nav-col :global(a:hover) {
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
    color: #8f86ab;
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
    color: #cfc6e8;
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
    color: #6b6280;
    margin: 0;
  }
  .footer-madein {
    font-size: 11.5px;
    color: #6b6280;
  }

  @media (max-width: 900px) {
    .nav-links { display: none; }
    .hero-inner { flex-direction: column; }
    .hero h1 { font-size: 28px; }
    .hero-visual { margin-top: 32px; min-height: 260px; }
    .facts-grid { grid-template-columns: repeat(2, 1fr); }
    .compare-grid { grid-template-columns: 1fr; }
    .features-grid { grid-template-columns: repeat(2, 1fr); }
    .steps-grid { grid-template-columns: 1fr; }
    .pricing-grid { grid-template-columns: repeat(2, 1fr); }
    .calc-box { grid-template-columns: 1fr; }
    .footer-top { flex-direction: column; gap: 28px; }
    .footer-bottom-row { flex-direction: column; text-align: center; }
  }
  @media (max-width: 560px) {
    .features-grid { grid-template-columns: 1fr; }
    .pricing-grid { grid-template-columns: 1fr; }
    .facts-grid { grid-template-columns: 1fr; }
    .mock-phone { width: 220px; }
    .mock-phone-back { width: 140px; right: 4px; }
  }
`;
