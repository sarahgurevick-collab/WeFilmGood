"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MenuCases from "./MenuCases";

/** Les années de la page : la liste se recharge quand on referme le menu. */
export default function SelecteurAnnees({ annees, cochees }: { annees: number[]; cochees: number[] }) {
  const router = useRouter();
  // Les cases se cochent sans recharger la page ; la liste est appliquée
  // quand on la referme (sinon la page se recharge à chaque clic).
  const [locales, setLocales] = useState(cochees);
  const resume =
    locales.length === 0
      ? "Aucune"
      : locales.length <= 3
        ? [...locales].sort((x, y) => y - x).join(", ")
        : `${locales.length} années`;
  return (
    <MenuCases
      libelle="Années"
      options={annees.map((a) => ({ valeur: String(a), libelle: String(a) }))}
      choisies={locales.map(String)}
      resume={resume}
      onChange={(suivantes) => setLocales(suivantes.map(Number))}
      onFerme={() => {
        const a = [...locales].sort((x, y) => y - x).join(",");
        if (a !== [...cochees].sort((x, y) => y - x).join(","))
          router.push(`/admin/fiches?annees=${a}`);
      }}
    />
  );
}
