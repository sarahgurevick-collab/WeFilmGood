/**
 * Le label WeFilmGood posé sur un projet labellisé (note supérieure à
 * 150/200 en comité de lecture).
 *
 * Le vrai logo de la marque, sur pastille blanche : les vignettes de
 * projet sont des photos de toutes teintes, et le logo seul, rouge sur
 * fond transparent, se perdrait sur les images sombres.
 */
export default function LabelWFG({ taille = 44 }: { taille?: number }) {
  return (
    <span
      title="Projet labellisé WeFilmGood"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: taille,
        height: taille,
        borderRadius: "50%",
        background: "#fff",
        boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
        flexShrink: 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/label-wfg.png"
        alt="Projet labellisé WeFilmGood"
        width={Math.round(taille * 0.82)}
        height={Math.round(taille * 0.82)}
        style={{ display: "block" }}
      />
    </span>
  );
}
