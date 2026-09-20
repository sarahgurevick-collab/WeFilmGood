/**
 * Le label WeFilmGood posé sur un projet labellisé (note supérieure à
 * 150/200 en comité de lecture).
 *
 * Le vrai logo de la marque, sur pastille blanche : les vignettes de
 * projet sont des photos de toutes teintes, et le logo seul, rouge sur
 * fond transparent, se perdrait sur les images sombres.
 *
 * Le fichier fait 1381 × 1113 — plus large que haut. La hauteur pilote
 * la taille, la largeur suit, pour que le logo ne soit jamais déformé.
 */
const RATIO = 1381 / 1113;

export default function LabelWFG({
  hauteur = 34,
  sansFond = false,
}: {
  hauteur?: number;
  /** Sur une fiche projet, le logo se suffit à lui-même : la pastille
   *  blanche ne sert que sur les vignettes, dont la teinte varie. */
  sansFond?: boolean;
}) {
  return (
    <span
      title="Projet labellisé WeFilmGood"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: sansFond
          ? 0
          : `${Math.round(hauteur * 0.26)}px ${Math.round(hauteur * 0.32)}px`,
        borderRadius: sansFond ? 0 : 999,
        background: sansFond ? "none" : "#fff",
        boxShadow: sansFond ? "none" : "0 1px 4px rgba(0,0,0,0.25)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/label-wfg.png"
        alt="Projet labellisé WeFilmGood"
        width={Math.round(hauteur * RATIO)}
        height={hauteur}
        style={{ display: "block" }}
      />
    </span>
  );
}
