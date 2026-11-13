import type { Metadata } from "next";
import Pagination from "@/components/Pagination";
import Link from "next/link";
import { redirect } from "next/navigation";
import Finder from "@/components/Finder";
import { categorieDeDepart, peutVoirLeNuage, personnagesDeLaGalaxie, talentsDeLaGalaxie } from "./actions";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import styles from "./projets.module.css";
import duo from "./duo.module.css";
import Suite from "./Suite";
import Apparition from "./Apparition";
import CarteAstre from "./CarteAstre";
import { PERSONNAGES_PAR_PAGE, cartesPersonnages, lotDeCartes } from "./lot";
import GrandNombre from "./GrandNombre";
import CineCrushEnTete from "./CineCrushEnTete";
import { createClient } from "@/lib/supabase/server";
import RechercheAvancee from "./RechercheAvancee";
import { adresse, lireFiltres, nombreDeFiltres } from "./filtres";
import { AUDIENCES, BUDGETS, FORMATS } from "@/app/projet/ChampsFiche";
import type { Tag } from "./tags";
import RechercheAvanceePersonnages from "./RechercheAvanceePersonnages";
import { AUCUN_PERSONNAGE, adressePersonnages, lireFiltresPersonnages, nombreDeFiltresPersonnages } from "./filtres-personnages";

export const metadata: Metadata = { title: "Galaxies — WeFilmGood" };

// Talents en constellation (essai du 12/11) : quatre par ligne, six lignes.
const GALAXIE_PAR_PAGE = 24;


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
    // La recherche avancée des personnages (13/11, Sarah).
    const filtresPersonnages = lireFiltresPersonnages(params);
    const nbFiltresPersonnages = nombreDeFiltresPersonnages(filtresPersonnages);
    const parPage = voir === "personnages" ? PERSONNAGES_PAR_PAGE : GALAXIE_PAR_PAGE;
    const [{ personnages, total: totalPersonnages }, { talents, total: totalTalents }] = await Promise.all([
      voir === "personnages"
        ? personnagesDeLaGalaxie(page, parPage, filtresPersonnages)
        : Promise.resolve({ personnages: [], total: 0 }),
      voir === "talents"
        ? talentsDeLaGalaxie(page, parPage)
        : Promise.resolve({ talents: [], total: 0 }),
    ]);
    const totalGalaxie = voir === "personnages" ? totalPersonnages : totalTalents;
    const affiches = voir === "personnages" ? personnages.length : talents.length;
    const pagesGalaxie = Math.max(1, Math.ceil(totalGalaxie / parPage));
    return (
      <PageShell
        title="Galaxies"
        apresTitre={<span className={styles.ancienNom}>l&apos;ancienne Pitchothèque</span>}
        nav="pitchotheque"
        connecte={!!user}
      >
        {/* La liste des talents (ou personnages) disparaît dès qu'un mot est cherché. */}
        <div className={duo.centre}>
        <Finder
          adherent={adherent}
          premiere={voir}
          avance={
            voir === "personnages" ? (
              <div className={duo.ligneAvancee}>
                <RechercheAvanceePersonnages filtres={filtresPersonnages} />
              </div>
            ) : undefined
          }
        >
        {voir === "personnages" && affiches === 0 ? (
          <p className={formStyles.hint}>
            Aucun personnage ne correspond à ces filtres.{" "}
            <Link href={adressePersonnages(AUCUN_PERSONNAGE)}>Tout effacer</Link>.
          </p>
        ) : (
        <p className={formStyles.hint}>
          {`${voir === "personnages" ? "Personnages" : "Talents"} ${((page - 1) * parPage + 1).toLocaleString("fr-FR")} à ${((page - 1) * parPage + affiches).toLocaleString("fr-FR")} sur ${totalGalaxie.toLocaleString("fr-FR")} ${nbFiltresPersonnages > 0 ? "correspondant à vos filtres" : "dans les Galaxies"}.`}
        </p>
        )}
        {voir === "personnages" ? (
          // Essai du 12/11 (Sarah) : des cartes à jouer, qui sortent du Finder
          // dos visible et se retournent en se posant.
          <Suite
            key={`${adressePersonnages(filtresPersonnages)}-${page}`}
            quoi="personnages"
            premier={cartesPersonnages(personnages)}
            page={page}
            pages={pagesGalaxie}
            filtresPersonnages={filtresPersonnages}
          />
        ) : (
          // Essai du 12/11 (Sarah) : de grands portraits ronds en constellation,
          // qui sortent du Finder puis flottent doucement.
          <ul className={duo.constellation}>
            {talents.map((t, i) => (
              <Apparition key={t.id} rang={i}>
                <CarteAstre t={t} />
              </Apparition>
            ))}
          </ul>
        )}
{voir === "talents" && (
                <Pagination
          page={page}
          pages={pagesGalaxie}
          total={totalGalaxie}
          parPage={parPage}
          base={`/galaxies?voir=${voir}`}
          libelle="Pages des Galaxies"
        />
        )}
        </Finder>
        </div>
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
