import type { Metadata } from "next";
import Pagination from "@/components/Pagination";
import Link from "next/link";
import { redirect } from "next/navigation";
import Finder, { CartePersonnage, CarteTalent } from "@/components/Finder";
import finderStyles from "@/components/Finder.module.css";
import { categorieDeDepart, peutVoirLeNuage, personnagesDeLaGalaxie, talentsDeLaGalaxie } from "./actions";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import styles from "./projets.module.css";
import duo from "./duo.module.css";
import Suite from "./Suite";
import { lotDeCartes } from "./lot";
import GrandNombre from "./GrandNombre";
import CineCrushEnTete from "./CineCrushEnTete";
import { createClient } from "@/lib/supabase/server";
import RechercheAvancee from "./RechercheAvancee";
import { adresse, lireFiltres, nombreDeFiltres } from "./filtres";
import { AUDIENCES, BUDGETS, FORMATS } from "@/app/projet/ChampsFiche";
import type { Tag } from "./tags";

export const metadata: Metadata = { title: "Galaxies — WeFilmGood" };

// Talents et personnages : six par ligne, dix lignes.
const GALAXIE_PAR_PAGE = 60;


export default async function ProjetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const params = await searchParams;
  const page = Math.max(1, Math.floor(Number(params.page)) || 1);
  const filtres = lireFiltres(params);
  const nbFiltres = nombreDeFiltres(filtres);

  // Les vignettes proviennent parfois de films ou d'images trouvées en
  // ligne : la pitchothèque n'est pas exposée aux visiteurs de passage.
  // Un producteur qui reçoit une recherche filtrée par mail est invité à
  // se connecter, ou à créer un compte, et retrouve ensuite la liste
  // filtrée telle qu'on la lui a envoyée — filtres et page compris.
  if (!user) {
    redirect(`/connexion?next=${encodeURIComponent(adresse(filtres, page))}`);
  }

  const [adherent, premiere] = await Promise.all([peutVoirLeNuage(), categorieDeDepart()]);

  // Sans mot cherché, les boutons « Talents » et « Personnages » de la
  // recherche amènent ici avec ?voir=… : eux à la place des projets (02/10).
  if (params.voir === "personnages" || params.voir === "talents") {
    const voir = params.voir;
    const [{ personnages, total: totalPersonnages }, { talents, total: totalTalents }] = await Promise.all([
      voir === "personnages"
        ? personnagesDeLaGalaxie(page, GALAXIE_PAR_PAGE)
        : Promise.resolve({ personnages: [], total: 0 }),
      voir === "talents"
        ? talentsDeLaGalaxie(page, GALAXIE_PAR_PAGE)
        : Promise.resolve({ talents: [], total: 0 }),
    ]);
    const totalGalaxie = voir === "personnages" ? totalPersonnages : totalTalents;
    const affiches = voir === "personnages" ? personnages.length : talents.length;
    const pagesGalaxie = Math.max(1, Math.ceil(totalGalaxie / GALAXIE_PAR_PAGE));
    return (
      <PageShell
        title="Galaxies"
        apresTitre={<span className={styles.ancienNom}>l&apos;ancienne Pitchothèque</span>}
        nav="pitchotheque"
        connecte={!!user}
      >
        {/* La liste des talents (ou personnages) disparaît dès qu'un mot est cherché. */}
        <Finder adherent={adherent} premiere={voir}>
        <p className={formStyles.hint}>
          {`${voir === "personnages" ? "Personnages" : "Talents"} ${((page - 1) * GALAXIE_PAR_PAGE + 1).toLocaleString("fr-FR")} à ${((page - 1) * GALAXIE_PAR_PAGE + affiches).toLocaleString("fr-FR")} sur ${totalGalaxie.toLocaleString("fr-FR")} dans les Galaxies.`}
        </p>
        {voir === "personnages" ? (
          <ul className={finderStyles.grillePersonnages}>
            {personnages.map((c) => (
              <li key={c.id}>
                <CartePersonnage c={c} />
              </li>
            ))}
          </ul>
        ) : (
          <ul className={finderStyles.grilleTalents}>
            {talents.map((t) => (
              <li key={t.id}>
                <CarteTalent t={t} />
              </li>
            ))}
          </ul>
        )}
        <Pagination
          page={page}
          pages={pagesGalaxie}
          total={totalGalaxie}
          parPage={GALAXIE_PAR_PAGE}
          base={`/galaxies?voir=${voir}`}
          libelle="Pages des Galaxies"
        />
        </Finder>
      </PageShell>
    );
  }

  const { data: genres } = await supabase.from("genres").select("slug, label_fr").order("position");
  // Les tags de la recherche avancée, dans l'ordre des lignes (02/11).
  const tags: Tag[] = [
    ...FORMATS.map((f) => ({ famille: "format" as const, valeur: f.value, libelle: f.label })),
    ...(genres ?? []).map((g) => ({ famille: "genre" as const, valeur: g.slug, libelle: g.label_fr })),
    ...AUDIENCES.map((a) => ({ famille: "audience" as const, valeur: a.value, libelle: a.label })),
    ...BUDGETS.map((b) => ({ famille: "budget" as const, valeur: b.value, libelle: b.label })),
  ];

  const { cartes, nombre, total, pages } = await lotDeCartes(supabase, user.id, page, filtres);

  return (
    <PageShell
      title="Galaxies"
      // Pour les membres de WFG 1, qui la connaissent sous son ancien nom
      // (changement du 29/09/2026).
      apresTitre={<span className={styles.ancienNom}>l&apos;ancienne Pitchothèque</span>}
      nav="pitchotheque"
      connecte={!!user}
    >
      {/* Le CinéCrush de la semaine, seul en haut (12/11, Sarah) : à l'arrivée
          seulement, pas sur les pages suivantes ni sur une liste filtrée. */}
      {page === 1 && nbFiltres === 0 && typeof params.q !== "string" && <CineCrushEnTete supabase={supabase} />}
      {/* La recherche avancée reste toujours là ; la liste des projets en dessous
          disparaît dès qu'un mot est cherché : ce qu'on ne demande pas ne
          revient pas après les résultats (03/10, demande de Sarah). */}
<div className={duo.centre}>
      <Finder
        adherent={adherent}
        filtres={filtres}
        premiere={premiere}
        requeteInitiale={typeof params.q === "string" ? params.q : ""}
        tags={tags}
        avance={
          // Le nombre de projets, petit, à côté du bouton (12/11, Sarah).
          <div className={duo.ligneAvancee}>
            <RechercheAvancee />
            {nombre > 0 && (
              <GrandNombre
                valeur={total}
                legende={`projet${total > 1 ? "s" : ""} ${nbFiltres > 0 ? "correspondant à vos filtres" : "dans les Galaxies"}`}
                anime={page === 1}
              />
            )}
          </div>
        }
      >
      {nombre === 0 ? (
        <p className={formStyles.hint}>
          {nbFiltres > 0 ? (
            <>
              Aucun projet ne correspond à ces filtres.{" "}
              <Link href={adresse({ format: null, genre: null, audience: null, budget: null, bandeau: null, equipe: null, selection: null, comedien: null })}>
                Tout effacer
              </Link>
              .
            </>
          ) : (
            <>
              Aucun projet public pour l&apos;instant.{" "}
              <Link href="/projet">Déposez le vôtre</Link>.
            </>
          )}
        </p>
      ) : (
        <>
          {/* Les cartes sortent de la barre du Finder et se posent deux par deux ;
              le bouton « Voir d'autres projets » en fait venir d'autres. */}
          <Suite key={adresse(filtres, page)} premier={cartes} page={page} pages={pages} filtres={filtres} />
        </>
      )}
      </Finder>
      </div>
    </PageShell>
  );
}
