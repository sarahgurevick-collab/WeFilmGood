/**
 * Le dessin d'un nuage aux quatre couleurs du site (03/10) : rouge, vert,
 * jaune, bleu, séparés par de fins traits obliques comme le disque du logo.
 * Il remplace le petit nuage de mots-clés, illisible à cette taille, sur le
 * bouton qui ouvre les mots-clés.
 */
export default function NuageCouleurs({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 64" className={className} aria-hidden="true">
      <mask id="nuage-couleurs">
        {/* Le nuage : une base arrondie et trois bosses. */}
        <g fill="#fff">
          <rect x="6" y="36" width="88" height="24" rx="12" />
          <circle cx="30" cy="38" r="17" />
          <circle cx="52" cy="28" r="23" />
          <circle cx="73" cy="40" r="16" />
        </g>
        {/* Les traits qui séparent les quatre couleurs. */}
        <g fill="#000" transform="rotate(14 50 32)">
          <rect x="28" y="-20" width="2.6" height="110" />
          <rect x="49" y="-20" width="2.6" height="110" />
          <rect x="70" y="-20" width="2.6" height="110" />
        </g>
      </mask>
      <g mask="url(#nuage-couleurs)">
        <g transform="rotate(14 50 32)">
          <rect x="-40" y="-20" width="69.3" height="110" fill="#da2c25" />
          <rect x="29.3" y="-20" width="21" height="110" fill="#35b05e" />
          <rect x="50.3" y="-20" width="21" height="110" fill="#f2c230" />
          <rect x="71.3" y="-20" width="70" height="110" fill="#3b8ef5" />
        </g>
      </g>
    </svg>
  );
}
