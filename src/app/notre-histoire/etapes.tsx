import Link from "next/link";
import type { EtapeFrise } from "@/components/Frise";
import { AFFICHES, HISTOIRE } from "@/data/association";
import { FESTIVALS, moisDuFestival, nomDuMois } from "@/data/festivals";
import { premierePhotoParAnnee } from "./photos";

/*
 * Les étapes de la frise « Notre histoire » (essai du 22/10/2026), bâties
 * avec ce qui existe déjà : une étape par année depuis 2012, l'affiche de
 * la Maison à Cannes quand il y en a une (2012-2019), sinon la première
 * photo de l'année (public/histoire/<festival>/<année>/, voir photos.ts),
 * sinon le logo du premier festival de l'année ; le nombre de projets sélectionnés par
 * festival et par programme (Writers-Producers Meetings, Scenariolab…),
 * chaque programme menant à sa liste dans /notre-histoire/[festival] ;
 * les phrases datées de la frise de l'association. Les phrases par année que Sarah écrira
 * viendront s'y ajouter. Page d'avant : étiquette git
 * « notre-histoire-avant-frise ».
 */

const PREMIERE_ANNEE = 2012;

function phrasesDeLAnnee(annee: number): string[] {
  return HISTOIRE.filter((h) => h.date === String(annee) || h.date.startsWith(`${annee} `)).map(
    (h) => (h.date === String(annee) ? h.texte : `${h.date} : ${h.texte}`),
  );
}

export function etapesHistoire(): EtapeFrise[] {
  const derniereAnnee = Math.max(
    PREMIERE_ANNEE,
    ...FESTIVALS.flatMap((f) => f.selections.map((s) => s.annee ?? 0)),
  );
  const etapes: EtapeFrise[] = [];
  const photos = premierePhotoParAnnee();

  for (let annee = PREMIERE_ANNEE; annee <= derniereAnnee; annee++) {
    const selections = FESTIVALS.map((f) => {
      const programmes = f.selections
        .filter((s) => s.annee === annee)
        .flatMap((s) => s.blocs)
        .map((b) => ({ titre: b.titre, nb: b.entrees.length }))
        .filter((b) => b.nb > 0);
      return { festival: f, programmes, mois: moisDuFestival(f, annee) };
    })
      .filter((s) => s.programmes.length > 0)
      // Dans l'ordre de l'année : février, mai, novembre… les mois
      // inconnus à la fin.
      .sort((a, b) => (a.mois ?? 99) - (b.mois ?? 99));
    const phrases = phrasesDeLAnnee(annee);
    if (selections.length === 0 && phrases.length === 0) continue;

    const affiche = AFFICHES.find((a) => a.annee === annee);
    const photo = photos[annee];
    const premier = selections[0]?.festival;
    const visuel = affiche
      ? {
          src: affiche.image,
          alt: `Affiche de la Maison des Scénaristes au Festival de Cannes, ${annee}, par ${affiche.auteur}`,
          forme: "affiche" as const,
        }
      : photo
        ? { src: photo.src, alt: photo.alt, forme: "affiche" as const }
        : premier?.logo
        ? {
            src: premier.logo,
            alt: premier.nom,
            forme: premier.logoRond
              ? ("rond" as const)
              : premier.logoClair
                ? ("affiche" as const)
                : ("carte" as const),
          }
        : undefined;

    etapes.push({
      id: String(annee),
      visuel,
      titre: String(annee),
      // Sarah, 23/10 : le nom des festivals seul, chacun sous son mois
      // (sans les programmes ni les phrases en gris). Ce qui était
      // affiché avant : étiquette git « frise-histoire-avant-mois ».
      calendrier: selections
        .filter((s) => s.mois)
        .map((s) => ({
          mois: s.mois!,
          libelleMois: nomDuMois(s.mois!),
          nom: s.festival.nom,
          href: `/notre-histoire/${s.festival.id}?annee=${annee}`,
          // Sarah, 23/10 : Cannes au-dessus de la règle.
          dessus: s.festival.id === "cannes",
          // Sarah, 23/10 : le logo, le nom au survol.
          logo: s.festival.logo,
          logoRond: s.festival.logoRond,
          logoClair: s.festival.logoClair,
        })),
      // Un festival dont le mois n'est pas connu (SATIS/VR) : sous la
      // règle, sans mois.
      detail: selections.some((s) => !s.mois) ? (
        <>
          {selections
            .filter((s) => !s.mois)
            .map((s) => (
              <Link
                key={s.festival.id}
                href={`/notre-histoire/${s.festival.id}?annee=${annee}`}
                className="lienFestival"
              >
                <strong>{s.festival.nom}</strong>
              </Link>
            ))}
        </>
      ) : undefined,
    });
  }

  return etapes;
}
