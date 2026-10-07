import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { signerImages } from "@/app/projet/[id]/fichiers";
import { AGES, GENRES_PERSONNAGE, TYPES } from "@/app/projet/[id]/personnages/options";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import NavAdmin from "../NavAdmin";
import BoutonRetirer from "./BoutonRetirer";
import CadrageCarte from "./CadrageCarte";
import ListeASupprimer from "./ListeASupprimer";
import PoserPhoto from "./PoserPhoto";
import { SEUIL_DESCRIPTION } from "./seuil";
import { retirerPortrait, supprimerPersonnages, validerPortrait } from "./actions";
import styles from "./portraits.module.css";

const PAR_PAGE = 24;
const PAR_PAGE_SECONDAIRES = 60;

type Onglet = "sans" | "moyen" | "bon" | "secondaires";

type Perso = {
  id: string;
  name: string;
  biography: string | null;
  photo_path: string | null;
  photo_x: number;
  photo_y: number;
  photo_proposee: boolean;
  project: { id: string; title: string } | null;
};

type Secondaire = {
  id: string;
  name: string;
  biography: string | null;
  gender: string | null;
  age_range: string | null;
  project: { id: string; title: string } | null;
};

type SansPortrait = {
  character_id: string;
  lot: string;
  note: string | null;
  requete: string | null;
  characters: {
    id: string;
    name: string;
    biography: string | null;
    gender: string | null;
    age_range: string | null;
    character_type: string | null;
    project: { id: string; title: string } | null;
  };
};

const libelle = (liste: { value: string; label: string }[], v: string | null) =>
  liste.find((o) => o.value === v)?.label ?? null;

const extrait = (texte: string | null, n: number) =>
  texte ? (texte.length > n ? `${texte.slice(0, n).trimEnd()}…` : texte) : null;

/**
 * Les portraits que WeFilmGood a posés sur les personnages (Pixabay, et
 * Wikipédia pour les personnes réelles), à relire sur la plateforme même
 * plutôt que dans un fichier (06/10, demande de Sarah). Les « moyens »
 * d'abord : ce sont ceux qu'elle regarde un par un.
 *
 * Un aidant de confiance (migration 0135) voit les mêmes trois onglets, mais
 * rien d'autre de l'administration (ni menu, ni membres). Dans « Sans
 * portrait », pour chaque personnage : les deux recherches toutes prêtes
 * (Unsplash, Adobe Stock gratuit) et un bouton pour poser la photo. Le suivi n'est lisible qu'avec la clé de service, ouverte
 * ici après la vérification de l'accès.
 */
export default async function PortraitsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ avis?: string; page?: string; erreur?: string }>;
}) {
  const supabase = await createClient();
  const [{ data: estAdmin }, { data: estAidant }] = await Promise.all([
    supabase.rpc("is_admin"),
    supabase.rpc("is_portrait_helper"),
  ]);
  const admin = estAdmin === true;
  if (!admin && estAidant !== true) redirect("/");
  const a = createAdminClient();
  if (!a) redirect("/");

  const sp = await searchParams;
  // L'administration s'ouvre sur les moyens, l'aidant sur les personnages sans portrait.
  const onglet: Onglet =
    sp.avis === "sans" || sp.avis === "moyen" || sp.avis === "bon" || (admin && sp.avis === "secondaires") ? sp.avis : admin ? "moyen" : "sans";
  const page = Math.max(1, Math.floor(Number(sp.page)) || 1);

  const compterAvis = async (avis: "moyen" | "bon") =>
    (
      await a
        .from("portraits_suivi")
        .select("character_id", { count: "exact", head: true })
        .eq("avis", avis)
        .not("source", "is", null)
    ).count ?? 0;
  // Les personnages sans portrait qu'on sait chercher (mots de recherche connus).
  const compterSans = async () =>
    (
      await a
        .from("portraits_suivi")
        .select("character_id, characters!inner(photo_path)", { count: "exact", head: true })
        .eq("avis", "rien")
        .not("requete", "is", null)
        .neq("requete", "")
        .is("characters.photo_path", null)
    ).count ?? 0;
  // Les personnages secondaires sans photo dont la description est vide ou presque
  // (le filtre sur la longueur se fait ici : la base ne sait pas le demander).
  const listerSecondaires = async () => {
    const { data } = await a
      .from("characters")
      .select("id, name, biography, gender, age_range, project:projects(id, title)")
      .eq("character_type", "secondaire")
      .is("photo_path", null)
      .order("name", { ascending: true })
      .returns<Secondaire[]>();
    return (data ?? []).filter((c) => (c.biography ?? "").trim().length < SEUIL_DESCRIPTION);
  };
  const secondaires = admin ? await listerSecondaires() : [];
  const nSecondaires = secondaires.length;
  const [nSans, nMoyens, nBons] = await Promise.all([
    compterSans(),
    compterAvis("moyen"),
    compterAvis("bon"),
  ]);
  const total = onglet === "sans" ? nSans : onglet === "moyen" ? nMoyens : onglet === "bon" ? nBons : nSecondaires;
  const parPage = onglet === "secondaires" ? PAR_PAGE_SECONDAIRES : PAR_PAGE;
  const nbPages = Math.max(1, Math.ceil(total / parPage));
  const de = (page - 1) * parPage;
  const a_ = de + parPage - 1;

  // ---- Onglet « Sans portrait » ----
  let sans: SansPortrait[] = [];
  if (onglet === "sans") {
    const { data } = await a
      .from("portraits_suivi")
      .select(
        "character_id, lot, note, requete, characters!inner(id, name, biography, gender, age_range, character_type, photo_path, project:projects(id, title))",
      )
      .eq("avis", "rien")
      .not("requete", "is", null)
      .neq("requete", "")
      .is("characters.photo_path", null)
      .order("traite_le", { ascending: false })
      .order("character_id", { ascending: true })
      .range(de, a_)
      .returns<SansPortrait[]>();
    sans = data ?? [];
  }

  // ---- Onglets « Moyens » et « Bons » ----
  const secondairesPage = onglet === "secondaires" ? secondaires.slice(de, a_ + 1) : [];

  let cartes: { s: { lot: string; note: string | null }; p: Perso; url: string | null }[] = [];
  if (onglet === "moyen" || onglet === "bon") {
    const { data: suivis } = await a
      .from("portraits_suivi")
      .select("character_id, lot, note, traite_le")
      .eq("avis", onglet)
      .not("source", "is", null)
      .order("traite_le", { ascending: false })
      .order("character_id", { ascending: true })
      .range(de, a_)
      .returns<{ character_id: string; lot: string; note: string | null; traite_le: string }[]>();

    const ids = (suivis ?? []).map((s) => s.character_id);
    const { data: persos } = ids.length
      ? await a
          .from("characters")
          .select("id, name, biography, photo_path, photo_x, photo_y, photo_proposee, project:projects(id, title)")
          .in("id", ids)
          .returns<Perso[]>()
      : { data: [] as Perso[] };
    const parId = new Map((persos ?? []).map((p) => [p.id, p]));
    const urls = await signerImages(a, (persos ?? []).map((p) => p.photo_path));

    // Un portrait que l'auteur a remplacé depuis n'est plus à relire.
    cartes = (suivis ?? []).flatMap((s) => {
      const p = parId.get(s.character_id);
      if (!p || !p.photo_proposee || !p.photo_path) return [];
      return [{ s, p, url: urls.get(p.photo_path) ?? null }];
    });
  }

  const lien = (o: Onglet, n = 1) => `/admin/portraits?avis=${o}${n > 1 ? `&page=${n}` : ""}`;
  const cherche = (requete: string) => {
    const reel = requete.startsWith("WIKI:");
    const mots = reel ? requete.slice(5) : requete;
    return {
      reel,
      mots,
      unsplash: `https://unsplash.com/fr/s/photos/${encodeURIComponent(mots.replace(/\s+/g, "-"))}`,
      google: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(mots)}`,
      adobe: `https://stock.adobe.com/fr/search/free?k=${encodeURIComponent(mots)}`,
      commons: `https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(mots)}&ns6=1`,
    };
  };

  return (
    <PageShell
      nav={admin ? "admin" : undefined}
      avantTitre={admin ? <NavAdmin /> : undefined}
      title="Portraits proposés"
      theme="clair"
    >
      <div className={styles.onglets}>
        <Link href={lien("sans")} className={onglet === "sans" ? styles.ongletActif : styles.onglet}>
          Sans portrait ({nSans})
        </Link>
        <Link href={lien("moyen")} className={onglet === "moyen" ? styles.ongletActif : styles.onglet}>
          Moyens ({nMoyens})
        </Link>
        <Link href={lien("bon")} className={onglet === "bon" ? styles.ongletActif : styles.onglet}>
          Bons ({nBons})
        </Link>
        {admin && (
          <Link href={lien("secondaires")} className={onglet === "secondaires" ? styles.ongletActif : styles.onglet}>
            Secondaires sans description ({nSecondaires})
          </Link>
        )}
      </div>

      {sp.erreur && <p className={formStyles.error}>{sp.erreur}</p>}

      {onglet === "sans" ? (
        <>
          <p className={formStyles.hint}>
            Cherche une photo avec les deux boutons, télécharge-la sur ton ordinateur, puis choisis-la ici.
          </p>
          {sans.length === 0 ? (
            <p className={formStyles.hint}>Aucun personnage à compléter.</p>
          ) : (
            <ul className={styles.grille}>
              {sans.map((s) => {
                const p = s.characters;
                const c = cherche(s.requete ?? "");
                const infos = [libelle(TYPES, p.character_type), libelle(GENRES_PERSONNAGE, p.gender), libelle(AGES, p.age_range)]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <li key={s.character_id} className={styles.carte}>
                    <h2 className={styles.nom}>{p.name}</h2>
                    {p.project && <p className={styles.projet}>« {p.project.title} »</p>}
                    {infos && <p className={styles.projet}>{infos}</p>}
                    {p.biography && <p className={styles.bio}>{extrait(p.biography, 420)}</p>}
                    {s.note && <p className={styles.note}>{s.note}</p>}
                    <p className={styles.lot}>Mots cherchés : {c.mots}</p>
                    <div className={styles.recherches}>
                      {c.reel ? (
                        <a href={c.commons} target="_blank" rel="noopener noreferrer" className={styles.ouvrir}>
                          Chercher sur Wikimedia Commons
                        </a>
                      ) : (
                        <>
                          <a href={c.unsplash} target="_blank" rel="noopener noreferrer" className={styles.ouvrir}>
                            Chercher sur Unsplash
                          </a>
                          <a href={c.google} target="_blank" rel="noopener noreferrer" className={styles.ouvrir}>
                            Chercher sur Google Images
                          </a>
                          <a href={c.adobe} target="_blank" rel="noopener noreferrer" className={styles.ouvrir}>
                            Chercher sur Adobe Stock (gratuit)
                          </a>
                        </>
                      )}
                    </div>
                    <PoserPhoto characterId={s.character_id} />
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : onglet === "secondaires" ? (
        <>
          <p className={formStyles.hint}>
            Personnages secondaires sans portrait, dont la description est vide ou d’une ligne. Coche ceux à supprimer :
            chaque fiche est sauvegardée avant d’être effacée.
          </p>
          {secondairesPage.length === 0 ? (
            <p className={formStyles.hint}>Aucun personnage dans cette liste.</p>
          ) : (
            <ListeASupprimer action={supprimerPersonnages}>
              <ul className={styles.grille}>
                {secondairesPage.map((p) => {
                  const infos = [libelle(GENRES_PERSONNAGE, p.gender), libelle(AGES, p.age_range)].filter(Boolean).join(" · ");
                  return (
                    <li key={p.id} className={styles.carte}>
                      <label className={styles.caseSuppression}>
                        <input type="checkbox" name="ids" value={p.id} />
                        <span className={styles.nom}>{p.name}</span>
                      </label>
                      {p.project && <p className={styles.projet}>« {p.project.title} »</p>}
                      {infos && <p className={styles.projet}>{infos}</p>}
                      <p className={styles.bio}>{extrait(p.biography, 120) ?? "Aucune description."}</p>
                    </li>
                  );
                })}
              </ul>
            </ListeASupprimer>
          )}
        </>
      ) : cartes.length === 0 ? (
        <p className={formStyles.hint}>Aucun portrait dans cette liste.</p>
      ) : (
        <ul className={styles.grille}>
          {cartes.map(({ s, p, url }) => (
            <li key={p.id} className={styles.carte}>
              {url ? (
                <CadrageCarte characterId={p.id} src={url} x={p.photo_x} y={p.photo_y} />
              ) : (
                <div className={styles.photo} />
              )}
              <h2 className={styles.nom}>{p.name}</h2>
              {p.project && <p className={styles.projet}>« {p.project.title} »</p>}
              {s.note && <p className={styles.note}>{s.note}</p>}
              {p.biography && <p className={styles.bio}>{extrait(p.biography, 200)}</p>}
              <p className={styles.lot}>{s.lot}</p>
              <div className={styles.actions}>
                {onglet === "moyen" && (
                  <form action={validerPortrait}>
                    <input type="hidden" name="character_id" value={p.id} />
                    <button type="submit" className={styles.valider}>
                      Valider
                    </button>
                  </form>
                )}
                <form action={retirerPortrait}>
                  <input type="hidden" name="character_id" value={p.id} />
                  <BoutonRetirer />
                </form>
                {admin && p.project && (
                  <Link
                    href={`/projet/${p.project.id}/personnages`}
                    className={styles.ouvrir}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ouvrir les personnages du projet
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {nbPages > 1 && (
        <div className={styles.pages}>
          {page > 1 && <Link href={lien(onglet, page - 1)}>← Précédente</Link>}
          <span className={formStyles.hint}>
            Page {page} sur {nbPages}
          </span>
          {page < nbPages && <Link href={lien(onglet, page + 1)}>Suivante →</Link>}
        </div>
      )}
    </PageShell>
  );
}
