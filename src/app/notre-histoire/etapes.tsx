import type { EtapeFrise } from "@/components/Frise";
import { AFFICHES, HISTOIRE } from "@/data/association";
import { FESTIVALS } from "@/data/festivals";

/*
 * Les étapes de la frise « Notre histoire » (essai du 22/10/2026), bâties
 * avec ce qui existe déjà : une étape par année depuis 2012, l'affiche de
 * la Maison à Cannes quand il y en a une (2012-2019), sinon le logo du
 * premier festival de l'année ; le nombre de projets sélectionnés par
 * festival (listes de /notre-histoire/[festival]) ; les phrases datées de
 * la frise de l'association. Les phrases par année que Sarah écrira
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

  for (let annee = PREMIERE_ANNEE; annee <= derniereAnnee; annee++) {
    const selections = FESTIVALS.map((f) => {
      const nb = f.selections
        .filter((s) => s.annee === annee)
        .reduce((total, s) => total + s.blocs.reduce((t, b) => t + b.entrees.length, 0), 0);
      return { festival: f, nb };
    }).filter((s) => s.nb > 0);
    const phrases = phrasesDeLAnnee(annee);
    if (selections.length === 0 && phrases.length === 0) continue;

    const affiche = AFFICHES.find((a) => a.annee === annee);
    const premier = selections[0]?.festival;
    const visuel = affiche
      ? {
          src: affiche.image,
          alt: `Affiche de la Maison des Scénaristes au Festival de Cannes, ${annee}, par ${affiche.auteur}`,
          forme: "affiche" as const,
        }
      : premier?.logo
        ? {
            src: premier.logo,
            alt: premier.nom,
            forme: premier.id === "cannes" ? ("carte" as const) : ("rond" as const),
          }
        : undefined;

    etapes.push({
      id: String(annee),
      visuel,
      titre: String(annee),
      detail: (
        <>
          {phrases.map((p, i) => (
            <span key={`p-${i}`}>
              {p}
              <br />
            </span>
          ))}
          {selections.map((s, i) => (
            <span key={s.festival.id}>
              <strong>{s.festival.nom}</strong> · {s.nb} projet{s.nb > 1 ? "s" : ""}{" "}
              sélectionné{s.nb > 1 ? "s" : ""}
              {i < selections.length - 1 && <br />}
            </span>
          ))}
        </>
      ),
    });
  }

  return etapes;
}
