/**
 * La marque WeFilmGood : le disque et son encoche en escalier.
 *
 * Tracé à partir du logo original fourni par la Maison des Scénaristes,
 * relevé au pixel près sur le fichier haute définition : disque de
 * centre (608.5 ; 559.5) et de rayon 531.5, encoche formée de trois
 * marches aux abscisses 830, 643 et 444, aux ordonnées 358, 590 et 823.
 *
 * La version précédente approximait l'encoche par un triangle, forme
 * qui n'appartient pas à la marque.
 *
 * Le texte « WE FILM GOOD » n'y figure pas : le logo est affiché ici
 * entre 22 et 46 pixels, taille à laquelle il serait illisible. Pour le
 * verrouillage complet (disque + texte), voir LabelWFG.
 */
export const ROUGE_WFG = "#DA2C25";

export default function Logo({
  size = 44,
  couleur = ROUGE_WFG,
}: {
  size?: number;
  couleur?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="77 28 1063 1063"
      role="img"
      aria-label="WeFilmGood"
    >
      <path
        fill={couleur}
        d="M 1100.3 358
           A 531.5 531.5 0 1 0 444 1064.9
           L 444 823 L 643 823 L 643 590 L 830 590 L 830 358 Z"
      />
    </svg>
  );
}
