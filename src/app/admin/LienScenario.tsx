import adminStyles from "./admin.module.css";

/**
 * Le bouton « scénario » de l'administration : une icône de fichier qui
 * ouvre le PDF dans un nouvel onglet (lien signé, une heure). Utilisé dans
 * la file d'attente et, depuis le 10/10 (Sarah), à côté de chaque projet de
 * l'écran des membres.
 */
export default function LienScenario({ href, petit = false }: { href: string; petit?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${adminStyles.boutonScenario} ${petit ? adminStyles.boutonScenarioPetit : ""}`}
      title="Ouvrir le scénario (nouvel onglet)"
      aria-label="Ouvrir le scénario"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
        <path d="M12 18v-6" />
        <path d="m9 15 3 3 3-3" />
      </svg>
    </a>
  );
}
