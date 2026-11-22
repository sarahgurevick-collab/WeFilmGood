import { estCoupDeCoeur } from "@/lib/coup-de-coeur";

/** Le cœur rouge du coup de cœur, affiché à côté d'une note qui dépasse 180. */
export default function CoeurNote({ note, taille = "1em" }: { note: number | null | undefined; taille?: string }) {
  if (!estCoupDeCoeur(note)) return null;
  return (
    <span title="Coup de cœur" aria-label="Coup de cœur" style={{ color: "#da2c25", fontSize: taille, marginLeft: 6 }}>
      ♥
    </span>
  );
}
