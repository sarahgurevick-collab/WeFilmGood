import type { ReactNode } from "react";
import {
  annee,
  dateEnLettres,
  type Appel,
} from "@/app/appels-a-projets/appels";
import Frise, { type EtapeFrise } from "./Frise";

/*
 * La frise des appels à projets (22/10/2026) : une étape par appel, la
 * date limite en gros, le logo du festival ; les appels passés en retrait.
 * Page d'avant : étiquette git « appels-a-projets-avant-frise ».
 */
export default function FriseAppels({
  appels,
  aujourdHui,
  titre,
  feuilles,
}: {
  appels: Appel[];
  /** La date du jour (AAAA-MM-JJ), décidée par le serveur pour que le rendu
      soit le même des deux côtés. */
  aujourdHui: string;
  titre: string;
  feuilles: { libelle: string; contenu: ReactNode }[];
}) {
  const annees = appels.map((a) => annee(a.dateLimite));
  const periode =
    annees.length === 0
      ? ""
      : annees[0] === annees[annees.length - 1]
        ? annees[0]
        : `${annees[0]} — ${annees[annees.length - 1]}`;

  const etapes: EtapeFrise[] = appels.map((appel) => {
    const passe = appel.dateLimite < aujourdHui;
    return {
      id: appel.id,
      visuel: {
        src: appel.logo,
        alt: appel.festival,
        forme: appel.logoLarge ? "carte" : "rond",
      },
      etiquette: passe ? "Édition précédente" : "Date limite",
      titre: dateEnLettres(appel.dateLimite),
      passe,
      detail: (
        <>
          <strong>{appel.festival}</strong> · {appel.format}
          <br />
          {appel.edition}
          <br />
          {appel.evenement}
          {appel.heureLimite && !passe && (
            <>
              <br />
              Jusqu&apos;à {appel.heureLimite}
            </>
          )}
        </>
      ),
    };
  });

  return (
    <Frise
      etapes={etapes}
      titre={titre}
      periode={periode}
      image="/association/rencontres/01.jpg"
      imageAlt="Rencontres auteurs-producteurs au Marché du Film de Cannes"
      feuilles={feuilles}
    />
  );
}
