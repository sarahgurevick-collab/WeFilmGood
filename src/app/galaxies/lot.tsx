import type { ReactNode } from "react";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import Bandeau from "@/components/Bandeau";
import LogoComplet from "@/components/LogoComplet";
import PersonnagesCarte from "@/components/PersonnagesCarte";
import EquipeCarte from "@/components/EquipeCarte";
import MarqueDejaOuvert from "@/components/MarqueDejaOuvert";
import { projetsDejaOuverts } from "@/lib/vues";
import { accesAuxFiches } from "@/lib/acces-fiches";
import { clientCartes } from "@/lib/supabase/admin";
import { FORMATS } from "@/app/projet/ChampsFiche";
import { SELECTION_PERSONNAGES, cheminsPortraits, personnagesDeLaCarte, type PersonnageBrut } from "./personnages-carte";
import { equipesDesCartes, lectureRestreinte } from "./equipe-carte";
import { parametresRpc, type Filtres } from "./filtres";
import Apparition from "./Apparition";
import styles from "./projets.module.css";
import duo from "./duo.module.css";

/**
 * Un lot de cartes des Galaxies : les projets d'une « page », prêts à être
 * affichés. La page en pose un premier lot ; le bouton « Voir d'autres
 * projets » en demande d'autres au serveur, qui viennent se ranger à la
 * suite (12/11/2026, Sarah : les numéros de page n'avaient plus de sens).
 */

// Vingt projets par lot : deux par ligne, dix lignes (12/11, Sarah : dix,
// « ce n'est pas assez »).
export const PAR_PAGE = 20;

type Projet = {
  id: string;
  title: string;
  tagline: string | null;
  status: string;
  format: string | null;
  target_audience: string | null;
  budget_range: string | null;
  bandeau: string | null;
  genre: { label_fr: string } | null;
  files: { storage_path: string; kind: string }[];
  characters: PersonnageBrut[] | null;
};

const SELECTION = `id, title, tagline, status, format, target_audience, budget_range, bandeau, genre:genres(label_fr), files:project_files(storage_path, kind), ${SELECTION_PERSONNAGES}`;

export async function lotDeCartes(
  supabase: SupabaseClient,
  userId: string,
  page: number,
  filtres: Filtres,
): Promise<{ cartes: ReactNode; nombre: number; total: number; pages: number }> {
  // L'ordre vient de la base (fonction « pitchotheque ») : labellisés
  // d'abord, puis par tranche de remplissage, tirés au sort chaque nuit.
  // Les filtres de la recherche avancée s'appliquent avant l'ordre.
  const { data: ordre, error: sansOrdre } = await supabase.rpc("pitchotheque", {
    p_limite: PAR_PAGE,
    p_decalage: (page - 1) * PAR_PAGE,
    ...parametresRpc(filtres),
  });
  if (sansOrdre) {
    // Le repli qui suit rend la page silencieusement : ce message est le
    // seul endroit où l'échec de la fonction « pitchotheque » se voit.
    console.error("Pitchothèque : fonction pitchotheque en échec, repli sur les plus récents", sansOrdre);
  }
  const lignes = (ordre ?? []) as { id: string; total: number }[];

  let projects: Projet[] | null;
  let total: number;
  if (!sansOrdre) {
    const ids = lignes.map((l) => l.id);
    total = Number(lignes[0]?.total ?? 0);
    const { data } = ids.length
      ? await clientCartes(supabase).from("projects").select(SELECTION).in("id", ids).eq("is_public", true).returns<Projet[]>()
      : { data: [] as Projet[] };
    const rang = new Map(ids.map((id, i) => [id, i]));
    projects = (data ?? []).sort((a, b) => (rang.get(a.id) ?? 0) - (rang.get(b.id) ?? 0));
  } else {
    // Tant que la fonction n'est pas installée dans la base : les plus
    // récents d'abord, comme avant.
    const { data, count } = await clientCartes(supabase)
      .from("projects")
      .select(SELECTION, { count: "exact" })
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .range((page - 1) * PAR_PAGE, page * PAR_PAGE - 1)
      .returns<Projet[]>();
    projects = data;
    total = count ?? 0;
  }
  const pages = Math.max(1, Math.ceil(total / PAR_PAGE));

  // Le stockage est privé : on signe les vignettes, et les portraits des
  // personnages de la carte (14/10), en un seul appel.
  const chemins = (projects ?? [])
    .flatMap((p) => [
      (p.files ?? []).find((f) => f.kind === "vignette")?.storage_path,
      ...cheminsPortraits(p.characters),
    ])
    .filter((c): c is string => Boolean(c));

  const { data: signes } = chemins.length
    ? await supabase.storage.from("project-media").createSignedUrls(chemins, 60 * 60)
    : { data: [] };

  const urlDe = new Map((signes ?? []).map((s) => [s.path, s.signedUrl]));
  // Les fiches que ce membre a déjà ouvertes (03/10) : un petit œil sur la carte.
  const dejaOuverts = await projetsDejaOuverts(supabase, (projects ?? []).map((p) => p.id));
  // Les talents déjà rattachés (19/10), sous chaque carte.
  const equipes = await equipesDesCartes(supabase, (projects ?? []).map((p) => p.id), await lectureRestreinte(supabase, userId));

  // Sans adhésion, le titre ne part pas vers le navigateur (12/11).
  const acces = await accesAuxFiches(supabase, userId);
  for (const p of projects ?? []) if (!acces.voitLeTitre(p.id)) p.title = "";

  const vignetteDe = (p: Projet) => {
    const chemin = (p.files ?? []).find((f) => f.kind === "vignette")?.storage_path;
    return chemin ? urlDe.get(chemin) ?? null : null;
  };

  // Les étiquettes d'un projet : format et genre seulement (12/11) ;
  // l'audience et le budget alourdissaient, ils restent à la recherche avancée.
  const libelleDe = (liste: readonly { value: string; label: string }[], valeur: string | null) =>
    liste.find((x) => x.value === valeur)?.label;
  const infosDe = (p: Projet) =>
    [
      { famille: "format" as const, libelle: libelleDe(FORMATS, p.format) },
      { famille: "genre" as const, libelle: p.genre?.label_fr },
    ].filter((i): i is { famille: "format" | "genre"; libelle: string } => Boolean(i.libelle));
  // Le contenu d'une carte : l'image, puis la tagline dessous, comme sur
  // WFG 1 (Nicolas, 12/11). Le titre ne part qu'aux adhérents : sans lui, la
  // ligne n'existe pas.
  const contenuCarte = (p: Projet) => {
    const vignette = vignetteDe(p);
    // Les informations du projet : format et genre — aux
    // couleurs des tags de la recherche avancée —, le titre (il ne part
    // qu'aux adhérents : sans lui, la ligne n'existe pas), puis la tagline.
    const texte = (
      <>
        <span className={duo.infos}>
          {infosDe(p).map((info) => (
            <span key={info.famille} className={`${duo.info} ${duo[info.famille]}`}>
              {info.libelle}
            </span>
          ))}
          {/* Sans titre, le logo des labellisés se range ici. */}
          {!p.title && p.status === "labellise" && (
            <span className={duo.labelSeul} title="Projet labellisé WeFilmGood">
              <LogoComplet hauteur={22} />
            </span>
          )}
        </span>
        {p.title && (
          <strong className={duo.titre}>
            {p.title}
            {p.status === "labellise" && (
              <span className={styles.label} title="Projet labellisé WeFilmGood">
                <LogoComplet hauteur={22} />
              </span>
            )}
          </strong>
        )}
        {p.tagline && <p className={duo.tagline}>{p.tagline}</p>}
      </>
    );
    return (
      <>
        {/* L'effet d'eau au survol est retiré (12/11, Sarah) : il marchait
            moins bien sur de grandes images. */}
        <Link href={`/projet/${p.id}`} className={`${styles.carte} ${styles.eau} ${duo.carte}`}>
          <div className={`${styles.vignette} ${duo.image}`}>
            <Bandeau valeur={p.bandeau} />
            {dejaOuverts.has(p.id) && <MarqueDejaOuvert />}
            {vignette ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={vignette} alt="" loading="lazy" />
              </>
            ) : (
              <span className={styles.sansImage}>Sans vignette</span>
            )}
          </div>
          {/* Le texte sous la photo, toujours visible (12/11, Sarah ; le volet
              blanc au survol façon WFG 1 a été essayé puis retiré). */}
          <div className={duo.legende}>{texte}</div>
        </Link>
        <EquipeCarte projetId={p.id} equipe={equipes.get(p.id)} />
        <PersonnagesCarte projetId={p.id} personnages={personnagesDeLaCarte(p.characters, urlDe)} />
      </>
    );
  };
  return {
    cartes: (projects ?? []).map((p, i) => (
      <Apparition key={p.id} rang={i}>
        {contenuCarte(p)}
      </Apparition>
    )),
    nombre: (projects ?? []).length,
    total,
    pages,
  };
}
