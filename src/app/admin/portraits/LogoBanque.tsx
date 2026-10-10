import styles from "./portraits.module.css";

/**
 * Un bouton rond avec le seul logo d'une banque d'images (10/10, Sarah) :
 * le nom complet est dans l'infobulle et pour les lecteurs d'écran.
 */
const LOGOS: Record<string, React.ReactNode> = {
  // Unsplash : deux rectangles, le bas évidé.
  unsplash: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M7.5 3h9v6.75h-9V3Zm0 9.75H3V21h18v-8.25h-4.5v3.75h-9v-3.75Z" />
    </svg>
  ),
  // Google : le G aux quatre couleurs.
  google: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4c-.2 1.2-.9 2.3-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6C4.8 19.8 8.1 22 12 22Z" />
      <path fill="#FBBC04" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1C2.4 8.8 2 10.4 2 12s.4 3.2 1.1 4.6L6.4 14Z" />
      <path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9C17 2.9 14.7 2 12 2 8.1 2 4.8 4.2 3.1 7.4L6.4 10c.8-2.3 3-4.1 5.6-4.1Z" />
    </svg>
  ),
  // Adobe Stock : le « St » sur fond rouge.
  adobe: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="4" fill="#FF3366" />
      <text x="12" y="16.5" textAnchor="middle" fontSize="11" fontWeight="800" fontFamily="Arial, sans-serif" fill="#fff">
        St
      </text>
    </svg>
  ),
  // Wikimedia Commons : le cercle rouge et les flèches, simplifié.
  commons: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" fill="#C00" />
      <path fill="none" stroke="#069" strokeWidth="2.2" d="M12 2.5a9.5 9.5 0 1 1-9.2 7" />
      <path fill="#069" d="M2.2 4.6 5.6 11l1.8-6.6-5.2.2Z" />
    </svg>
  ),
};

export default function LogoBanque({ href, titre, nom }: { href: string; titre: string; nom: keyof typeof LOGOS }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={styles.logo} title={titre} aria-label={titre}>
      {LOGOS[nom]}
    </a>
  );
}
