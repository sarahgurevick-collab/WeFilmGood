import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import NavAdmin from "../NavAdmin";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import adminStyles from "../admin.module.css";
import { prendreLaPlace } from "../profils/prise-de-place";
import { basculerValidation } from "../profils/actions";
import styles from "./page.module.css";
import CasesAffichage from "./CasesAffichage";
import FiltresAuto from "./FiltresAuto";
import FormatsLecteur from "./FormatsLecteur";
import { createAdminClient } from "@/lib/supabase/admin";

type Membre = {
  profile_id: string;
  full_name: string | null;
  email: string | null;
  category: string | null;
  role_wfg1: string | null;
  country: string | null;
  city: string | null;
  postal_code: string | null;
  avatar_url: string | null;
  website: string | null;
  biofilmo: string | null;
  validation_status: string;
  inscrit_le: string;
  adhesion: string | null;
  nb_projets: number;
  dernier_projet_annee: number | null;
  formats: string[] | null;
  derniere_activite: string | null;
  est_lecteur: boolean;
};

/* Les métiers : ceux de WFG 2 (roles) et les rôles repris de WFG 1, sous
   un même libellé. */
const METIERS: Record<string, string> = {
  auteur: "Auteur",
  author: "Auteur",
  scenariste: "Scénariste",
  producteur: "Producteur",
  producer: "Producteur",
  talent: "Talent",
  director: "Réalisateur",
  realisateur: "Réalisateur",
  actor: "Comédien",
  comedien: "Comédien",
  novelist: "Romancier",
  romancier: "Romancier",
  composer: "Compositeur",
  compositeur: "Compositeur",
  reader: "Lecteur",
  lecteur: "Lecteur",
  photodirector: "Directeur photo",
  directeur_photo: "Directeur photo",
  editor: "Monteur",
  monteur: "Monteur",
  theater: "Auteur de théâtre",
  auteur_theatre: "Auteur de théâtre",
  comicbook: "Auteur de BD",
  auteur_bd: "Auteur de BD",
  animator2d3d: "Animateur 2D/3D",
  animateur_2d_3d: "Animateur 2D/3D",
  soundengineer: "Sound designer",
  sound_designer: "Sound designer",
  hdecorator: "Chef décorateur",
  chef_decorateur: "Chef décorateur",
  sfxcreator: "Créateur SFX digitaux",
  sfx_digitaux: "Créateur SFX digitaux",
  institutional: "Institutionnel",
  cinefan: "Cinéphile",
  admin: "Administration",
};

const FORMATS: Record<string, string> = {
  long_metrage: "LM",
  court_metrage: "CM",
  serie: "Séries",
  immersif_360_vr: "VR/360",
};

const PROJETS_CHOIX: [string, string][] = [
  ["", "Peu importe le nombre"],
  ["0", "0 projet déposé"],
  ["1", "1 projet déposé"],
  ["2", "2 projets déposés"],
  ["3", "3 ou plus"],
];

const PAR_PAGE = 50;

const nomsDePays = new Intl.DisplayNames(["fr"], { type: "region" });
function nomDuPays(code: string | null) {
  if (!code) return "—";
  try {
    return nomsDePays.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

function metierDe(m: Membre) {
  const cle = m.category ?? m.role_wfg1;
  return cle ? (METIERS[cle] ?? cle) : "—";
}

const dateCourte = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

/**
 * L'écran des membres, reconstruit d'après celui de WFG 1 (26/09/2026) :
 * la liste de tous les comptes, avec les filtres que Sarah utilise pour
 * trier les talents — recherche, métier, format, année du dernier projet,
 * pays, adhésion, nombre de projets déposés — et, derrière « Affichage »,
 * les colonnes qu'on ajoute ou retire (profil étendu, biofilmo, date
 * d'inscription, dernière activité). Les compteurs d'alerte viendront
 * dans un second temps.
 */
export default async function MembresPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");

  // L'API ne rend que 1 000 lignes par lecture : on lit tout, page par page
  // (le premier passage ne voyait que 1 000 membres sur 3 612).
  const tous: Membre[] = [];
  for (let debut = 0; ; debut += 1000) {
    const { data } = await supabase.rpc("admin_membres").range(debut, debut + 999);
    const lot = (data ?? []) as Membre[];
    tous.push(...lot);
    if (lot.length < 1000) break;
  }

  // Les formats que chaque lecteur peut lire (27/09).
  const service = createAdminClient();
  const { data: profilsLecteur } = service
    ? await service.from("reader_profiles").select("profile_id, formats, availability_status")
    : { data: null };
  const lignesLecteur = (profilsLecteur ?? []) as {
    profile_id: string;
    formats: string[] | null;
    availability_status: string | null;
  }[];
  const formatsDe = new Map(lignesLecteur.map((r) => [r.profile_id, r.formats]));
  const dispoDe = new Map(lignesLecteur.map((r) => [r.profile_id, r.availability_status]));

  // Pour les lecteurs (27/09, l'ancienne page Lecteurs rejoint celle-ci) :
  // le nombre de fiches et la date de la dernière, WFG 1 et WFG 2 réunis.
  const fichesDe = new Map<string, { n: number; derniere: string | null }>();
  if (service && sp.metier === "Lecteur") {
    const ids = lignesLecteur.map((r) => r.profile_id);
    const [{ data: nouvelles }, { data: anciensIds }] = await Promise.all([
      service.from("reading_reports").select("reader_id, submitted_at").in("reader_id", ids),
      service.from("profiles").select("id, legacy_user_id").in("id", ids).not("legacy_user_id", "is", null),
    ]);
    const ajoute = (id: string, date: string | null) => {
      const e = fichesDe.get(id) ?? { n: 0, derniere: null };
      e.n += 1;
      if (date && (!e.derniere || date > e.derniere)) e.derniere = date;
      fichesDe.set(id, e);
    };
    for (const f of nouvelles ?? []) ajoute(f.reader_id, f.submitted_at);
    const parAncien = new Map((anciensIds ?? []).map((p) => [p.legacy_user_id as number, p.id as string]));
    if (parAncien.size) {
      // Plus de 1 000 fiches : l'API n'en rend que 1 000 par lecture.
      for (let debut = 0; ; debut += 1000) {
        const { data: anciennes } = await service
          .from("legacy_reading_reports")
          .select("reader_legacy_id, read_at")
          .in("reader_legacy_id", [...parAncien.keys()])
          .neq("statut", 0)
          .order("legacy_review_id")
          .range(debut, debut + 999);
        for (const f of anciennes ?? []) ajoute(parAncien.get(f.reader_legacy_id)!, f.read_at);
        if (!anciennes || anciennes.length < 1000) break;
      }
    }
  }
  const DISPO: Record<string, string> = { vert: "Disponible", orange: "Peu disponible", rouge: "Indisponible" };

  // Les filtres, lus dans l'adresse : la page se partage et se recharge.
  const q = (sp.q ?? "").trim().toLowerCase();
  const metier = sp.metier ?? "";
  const format = sp.format ?? "";
  const annee = sp.annee ?? "";
  const pays = sp.pays ?? "";
  const adhesion = sp.adhesion ?? "";
  const projets = sp.projets ?? "";
  const tri = sp.tri ?? "inscription";
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  // Par défaut, rien de coché : le nom et l'email. Le profil étendu ajoute
  // la photo, le pays, le code postal, la ville et la référence.
  const affichage = new Set((sp.aff ?? "").split(",").filter(Boolean));

  // Les métiers sont regroupés par libellé : « producer » (WFG 1) et
  // « producteur » (WFG 2) sont le même métier.
  const metierDeCle = (cle: string | null) => (cle ? (METIERS[cle] ?? cle) : null);
  const metiersPresents = new Map<string, number>();
  const paysPresents = new Map<string, number>();
  const anneesPresentes = new Set<number>();
  // Un lecteur compte comme « Lecteur » même si son métier est autre
  // (ou inconnu) : c'est la marque « lecteur » de WFG 2 qui fait foi.
  const estLecteur = (m: Membre) => m.est_lecteur || m.role_wfg1 === "reader";
  // Les profils à valider (27/09, l'ancienne page « Profils à valider »
  // rejoint celle-ci) : producteurs et talents inscrits sur WFG 2, hors
  // lecteurs. Les comptes repris de WFG 1 ne sont pas des inscriptions.
  const aValider = (m: Membre) =>
    m.validation_status !== "non_requise" && !m.est_lecteur && m.role_wfg1 === null;
  for (const m of tous) {
    const libelle = metierDeCle(m.category ?? m.role_wfg1);
    if (libelle && libelle !== "Lecteur") metiersPresents.set(libelle, (metiersPresents.get(libelle) ?? 0) + 1);
    if (estLecteur(m)) metiersPresents.set("Lecteur", (metiersPresents.get("Lecteur") ?? 0) + 1);
    if (m.country) paysPresents.set(m.country, (paysPresents.get(m.country) ?? 0) + 1);
    if (m.dernier_projet_annee) anneesPresentes.add(m.dernier_projet_annee);
  }

  const filtres = tous.filter((m) => {
    if (q && !(`${m.full_name ?? ""} ${m.email ?? ""}`.toLowerCase().includes(q))) return false;
    if (metier === "avalider") {
      if (!aValider(m)) return false;
    } else if (metier === "Lecteur" ? !estLecteur(m) : metier && metierDeCle(m.category ?? m.role_wfg1) !== metier) return false;
    if (format && !(m.formats ?? []).includes(format)) return false;
    if (annee && String(m.dernier_projet_annee ?? "") !== annee) return false;
    if (pays && m.country !== pays) return false;
    if (adhesion === "active" && !m.adhesion) return false;
    if (adhesion === "aucune" && m.adhesion) return false;
    if (projets === "0" && m.nb_projets !== 0) return false;
    if (projets === "1" && m.nb_projets !== 1) return false;
    if (projets === "2" && m.nb_projets !== 2) return false;
    if (projets === "3" && m.nb_projets < 3) return false;
    return true;
  });

  filtres.sort((a, b) => {
    if (tri === "nom") return (a.full_name ?? "").localeCompare(b.full_name ?? "", "fr");
    if (tri === "inscription") return b.inscrit_le.localeCompare(a.inscrit_le);
    if (tri === "projets") return b.nb_projets - a.nb_projets;
    return (b.derniere_activite ?? "").localeCompare(a.derniere_activite ?? "");
  });

  const nbPages = Math.max(1, Math.ceil(filtres.length / PAR_PAGE));
  const pageCourante = Math.min(page, nbPages);
  const visibles = filtres.slice((pageCourante - 1) * PAR_PAGE, pageCourante * PAR_PAGE);

  // L'adresse d'une autre page, les mêmes filtres.
  const lienPage = (n: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v && k !== "page") params.set(k, v);
    params.set("page", String(n));
    return `/admin/membres?${params.toString()}`;
  };

  return (
    <PageShell nav="admin" avantTitre={<NavAdmin />} title="Membres" theme="clair">
      <FiltresAuto className={styles.filtres}>
        <input
          type="search"
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Nom ou email"
          className={styles.recherche}
        />

        <select name="metier" defaultValue={metier} className={styles.menu}>
          <option value="">Tous les comptes</option>
          <option value="avalider">À valider ({tous.filter(aValider).length})</option>
          {[...metiersPresents.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([libelle, n]) => (
              <option key={libelle} value={libelle}>
                {libelle} ({n})
              </option>
            ))}
        </select>

        <select name="format" defaultValue={format} className={styles.menu}>
          <option value="">Tous les formats</option>
          {Object.entries(FORMATS).map(([cle, l]) => (
            <option key={cle} value={cle}>
              {l}
            </option>
          ))}
        </select>

        <select name="annee" defaultValue={annee} className={styles.menu}>
          <option value="">Année du dernier projet</option>
          {[...anneesPresentes]
            .sort((a, b) => b - a)
            .map((a) => (
              <option key={a} value={String(a)}>
                {a}
              </option>
            ))}
        </select>

        <select name="pays" defaultValue={pays} className={styles.menu}>
          <option value="">Tous les pays</option>
          {[...paysPresents.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([code, n]) => (
              <option key={code} value={code}>
                {nomDuPays(code)} ({n})
              </option>
            ))}
        </select>

        <select name="adhesion" defaultValue={adhesion} className={styles.menu}>
          <option value="">Adhésions : toutes</option>
          <option value="active">Adhésion active</option>
          <option value="aucune">Sans adhésion</option>
        </select>

        <select name="projets" defaultValue={projets} className={styles.menu}>
          {PROJETS_CHOIX.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>

        <select name="tri" defaultValue={tri} className={styles.menu}>
          <option value="inscription">Tri : les plus récents</option>
          <option value="activite">Tri : dernière activité</option>
          <option value="projets">Tri : nombre de projets</option>
          <option value="nom">Tri : nom</option>
        </select>

        {/* « Affichage » : ce qu'on ajoute ou retire, comme sur WFG 1 —
            le profil étendu (photo, email, pays, code postal) dans la
            case du membre, les autres en colonnes. */}
        <CasesAffichage
          cases={[
            ["etendu", "Profil étendu"],
            ["biofilmo", "Biofilmo"],
            ["inscription", "Date d'inscription"],
            ["activite", "Dernière activité"],
          ]}
          cochees={[...affichage]}
        />

        <Link href="/admin/membres" className={styles.effacer}>
          Tout effacer
        </Link>
      </FiltresAuto>

      {metier === "Lecteur" && (
        <p className={formStyles.hint} style={{ marginTop: 16 }}>
          Le nombre de fiches mène à la page du lecteur (détail, factures).{" "}
          <Link href="/admin/lecteurs">Anciens lecteurs de WFG 1</Link>
        </p>
      )}
      <p className={formStyles.hint} style={{ marginTop: 16 }}>
        {filtres.length === tous.length
          ? `${tous.length} membres.`
          : `${filtres.length} membres sur ${tous.length}.`}{" "}
        {nbPages > 1 && `Page ${pageCourante} sur ${nbPages}.`}
      </p>

      <div className={adminStyles.tableWrap}>
        <table className={adminStyles.table}>
          <thead>
            <tr>
              <th className={styles.colMembre}>Membre</th>
              <th>Métier</th>
              <th>Projets</th>
              <th>Formats</th>
              <th>Adhésion</th>
              {metier === "Lecteur" && <th>Disponibilité</th>}
              {metier === "Lecteur" && <th>Fiches</th>}
              {metier === "Lecteur" && <th>Dernière fiche</th>}
              {metier === "avalider" && <th>Validation</th>}
              {affichage.has("biofilmo") && <th>Biofilmo</th>}
              {affichage.has("inscription") && <th>Inscrit</th>}
              {affichage.has("activite") && <th>Dernière activité</th>}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((m) => (
              <tr key={m.profile_id}>
                <td className={styles.colMembre}>
                  {affichage.has("etendu") ? (
                    <div className={styles.etendu}>
                      <span className={styles.photo} aria-hidden="true">
                        {m.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.avatar_url} alt="" />
                        ) : (
                          <span>{(m.full_name ?? "?").trim().charAt(0).toUpperCase()}</span>
                        )}
                      </span>
                      <div>
                        <Link href={`/membres/${m.profile_id}`}>{m.full_name ?? "Sans nom"}</Link>
                        <br />
                        <span className={formStyles.hint}>{m.email}</span>
                        <br />
                        <span className={formStyles.hint}>
                          {[nomDuPays(m.country), m.postal_code, m.city].filter((x) => x && x !== "—").join(" · ") || "—"}
                        </span>
                        {m.website && (
                          <>
                            <br />
                            <a href={m.website} target="_blank" rel="noopener noreferrer" className={formStyles.hint}>
                              {m.website.replace(/^https?:\/\/(www\.)?/, "").slice(0, 40)}
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <Link href={`/membres/${m.profile_id}`}>{m.full_name ?? "Sans nom"}</Link>
                      <br />
                      <span className={formStyles.hint}>{m.email}</span>
                    </>
                  )}
                </td>
                <td>
                  {metierDe(m)}
                  {m.est_lecteur && <span className={adminStyles.badge}>lecteur</span>}
                  {m.est_lecteur && (
                    <FormatsLecteur profileId={m.profile_id} formats={formatsDe.get(m.profile_id) ?? null} />
                  )}
                </td>
                <td>
                  {m.nb_projets}
                  {m.dernier_projet_annee ? (
                    <span className={formStyles.hint}> · {m.dernier_projet_annee}</span>
                  ) : null}
                </td>
                <td>{(m.formats ?? []).map((f) => FORMATS[f] ?? f).join(", ") || "—"}</td>
                <td>{m.adhesion ? m.adhesion.replace("palier_", "") + " €" : "—"}</td>
                {metier === "Lecteur" && <td>{DISPO[dispoDe.get(m.profile_id) ?? "vert"]}</td>}
                {metier === "Lecteur" && (
                  <td>
                    <Link href={`/admin/lecteurs/${m.profile_id}`}>{fichesDe.get(m.profile_id)?.n ?? 0}</Link>
                  </td>
                )}
                {metier === "Lecteur" && <td>{dateCourte(fichesDe.get(m.profile_id)?.derniere ?? null)}</td>}
                {metier === "avalider" && (
                  <td>
                    {m.website ? (
                      <form action={basculerValidation}>
                        <input type="hidden" name="profile_id" value={m.profile_id} />
                        <input type="hidden" name="vers" value={m.validation_status === "refusee" ? "validee" : "refusee"} />
                        <button
                          type="submit"
                          className={m.validation_status === "refusee" ? adminStyles.voyantRouge : adminStyles.voyantVert}
                          title={
                            m.validation_status === "refusee"
                              ? "Référence écartée — cliquer pour la rétablir"
                              : "Référence acceptée — cliquer pour l'écarter"
                          }
                        >
                          {m.validation_status === "refusee" ? "Non valide" : "Validé"}
                        </button>
                      </form>
                    ) : (
                      <span className={formStyles.hint}>en attente — pas de référence</span>
                    )}
                  </td>
                )}
                {affichage.has("biofilmo") && (
                  <td className={styles.biofilmo}>{m.biofilmo?.slice(0, 160) || "—"}</td>
                )}
                {affichage.has("inscription") && <td>{dateCourte(m.inscrit_le)}</td>}
                {affichage.has("activite") && <td>{dateCourte(m.derniere_activite)}</td>}
                <td>
                  <form action={prendreLaPlace}>
                    <input type="hidden" name="profile_id" value={m.profile_id} />
                    <button
                      type="submit"
                      className={adminStyles.linkButton}
                      title="Se connecter à sa place"
                    >
                      Prendre sa place
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {nbPages > 1 && (
        <p className={styles.pages}>
          {pageCourante > 1 && <Link href={lienPage(pageCourante - 1)}>← Précédente</Link>}
          <span>
            Page {pageCourante} / {nbPages}
          </span>
          {pageCourante < nbPages && <Link href={lienPage(pageCourante + 1)}>Suivante →</Link>}
        </p>
      )}
    </PageShell>
  );
}
