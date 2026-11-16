import Link from "next/link";
import BulleInfo from "@/components/BulleInfo";
import { TEXTES } from "./textes";

/**
 * Ce qu'un profil incomplet limite sur CinéMatch, dit dans une bulle à
 * l'arrivée (16/11/2026, Sarah) :
 *  - adhérent mais profil incomplet : le nom et la photo du match restent
 *    cachés — la bulle liste ce qui manque ;
 *  - pas de « Je suis… » : on n'apparaît pas dans les matchs des autres.
 * Sans adhésion, c'est l'adhésion qui limite : pas de bulle, la phrase sous
 * le match renvoie vers l'adhésion.
 */
export default function BulleCineMatch({
  nomCache,
  manquants,
  sansCategorie = false,
}: {
  /** Adhérent, un match trouvé, mais un profil incomplet. */
  nomCache: boolean;
  manquants: string[];
  sansCategorie?: boolean;
}) {
  const nom = nomCache && manquants.length > 0;
  if (!nom && !sansCategorie) return null;

  return (
    <BulleInfo>
      {nom && (
        <p>
          {TEXTES.bulleProfilIncomplet} {manquants.join(" · ")}.
        </p>
      )}
      {sansCategorie && <p>{TEXTES.completerProfil}</p>}
      <p>
        <Link href="/profil">{TEXTES.voirProfilIncomplet}</Link>
      </p>
    </BulleInfo>
  );
}
