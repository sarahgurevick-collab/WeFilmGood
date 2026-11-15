"use client";

import { useRouter } from "next/navigation";
import MenuCases from "./MenuCases";

/** Les années de la page : cocher ou décocher recharge la liste. */
export default function SelecteurAnnees({ annees, cochees }: { annees: number[]; cochees: number[] }) {
  const router = useRouter();
  const resume =
    cochees.length === 0
      ? "Aucune"
      : cochees.length <= 3
        ? cochees.join(", ")
        : `${cochees.length} années`;
  return (
    <MenuCases
      libelle="Années"
      options={annees.map((a) => ({ valeur: String(a), libelle: String(a) }))}
      choisies={cochees.map(String)}
      resume={resume}
      onChange={(suivantes) =>
        router.push(`/admin/fiches?annees=${suivantes.map(Number).sort((x, y) => y - x).join(",")}`)
      }
    />
  );
}
