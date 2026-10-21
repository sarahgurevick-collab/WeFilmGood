import { ROUGE_WFG } from "@/lib/engagements";

/**
 * « CinéMatch » en deux couleurs, comme dans le menu (21/10/2026, Sarah) :
 * « Ciné » reste au rouge WeFilmGood, « Match » suit l'horloge des
 * engagements (var(--engagement)), la même que le logo de la bande blanche.
 */
export default function TitreCineMatch() {
  return (
    <>
      <span style={{ color: ROUGE_WFG }}>Ciné</span>
      <span style={{ color: "var(--engagement, #da2c25)" }}>Match</span>
    </>
  );
}
