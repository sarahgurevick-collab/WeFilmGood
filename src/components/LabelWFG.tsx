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

export default function LabelWFG({ hauteur = 34 }: { hauteur?: number }) {
  return (
    <span
      title="Projet labellisé WeFilmGood"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: `${Math.round(hauteur * 0.26)}px ${Math.round(hauteur * 0.32)}px`,
        borderRadius: 999,
        background: "#fff",
        boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
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
