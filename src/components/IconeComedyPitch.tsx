import { useId } from "react";

/**
 * Icône du comedypitch (dessins retenus par Sarah le 13/11 : A et D).
 * - « attendu » : triangle lecture vide, un comédien devant → le projet attend son comedypitch.
 * - « disponible » : le même, triangle plein → des comedypitchs sont à voir.
 * L'icône prend la couleur du texte qui l'entoure (currentColor) et le fond reste transparent.
 */
export default function IconeComedyPitch({
  etat,
  taille = 24,
  titre,
  className,
}: {
  etat: "attendu" | "disponible";
  taille?: number;
  /** Texte lu par les lecteurs d'écran ; sans lui, l'icône est décorative. */
  titre?: string;
  className?: string;
}) {
  const masque = useId();
  const corps = "M110 200 V160 a10 10 0 0 1 10 -10 h20 a10 10 0 0 1 10 10 v40 z";
  const bras = "M146 160 L168 171 L187 160";

  return (
    <svg
      viewBox="0 0 200 200"
      width={taille}
      height={taille}
      className={className}
      role={titre ? "img" : undefined}
      aria-label={titre}
      aria-hidden={titre ? undefined : true}
    >
      {/* Le masque découpe le triangle autour du comédien, pour que les deux se détachent. */}
      <mask id={masque} maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
        <rect width="200" height="200" fill="#fff" />
        <g fill="#000" stroke="#000" strokeWidth="12" strokeLinejoin="round" strokeLinecap="round">
          <circle cx="130" cy="128" r="15" />
          <path d={corps} />
          <path d={bras} fill="none" strokeWidth="27" />
        </g>
      </mask>
      <path
        d="M40 30 L40 170 L165 100 Z"
        fill={etat === "disponible" ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="16"
        strokeLinejoin="round"
        mask={`url(#${masque})`}
      />
      <circle cx="130" cy="128" r="15" fill="currentColor" />
      <path d={corps} fill="currentColor" />
      <path
        d={bras}
        fill="none"
        stroke="currentColor"
        strokeWidth="15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
