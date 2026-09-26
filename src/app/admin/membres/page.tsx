import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import NavAdmin from "../NavAdmin";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import adminStyles from "../admin.module.css";
import { prendreLaPlace } from "../profils/prise-de-place";
import styles from "./page.module.css";

type Membre = {
  profile_id: string;
  full_name: string | null;
  email: string | null;
  category: string | null;
  role_wfg1: string | null;
  country: string | null;
  city: string | null;
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

  const { data } = await supabase.rpc("admin_membres");
  const tous = (data ?? []) as Membre[];

  // Les filtres, lus dans l'adresse : la page se partage et se recharge.
  const q = (sp.q ?? "").trim().toLowerCase();
  const metier = sp.metier ?? "";
  const format = sp.format ?? "";
  const annee = sp.annee ?? "";
  const pays = sp.pays ?? "";
  const adhesion = sp.adhesion ?? "";
  const projets = sp.projets ?? "";
  const tri = sp.tri ?? "activite";
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const affichage = new Set((sp.aff ?? "etendu").split(",").filter(Boolean));

  const metiersPresents = new Map<string, number>();
  const paysPresents = new Map<string, number>();
  const anneesPresentes = new Set<number>();
  for (const m of tous) {
    const cle = m.category ?? m.role_wfg1;
    if (cle) metiersPresents.set(cle, (metiersPresents.get(cle) ?? 0) + 1);
    if (m.country) paysPresents.set(m.country, (paysPresents.get(m.country) ?? 0) + 1);
    if (m.dernier_projet_annee) anneesPresentes.add(m.dernier_projet_annee);
  }

  const filtres = tous.filter((m) => {
    if (q && !(`${m.full_name ?? ""} ${m.email ?? ""}`.toLowerCase().includes(q))) return false;
    if (metier && (m.category ?? m.role_wfg1) !== metier) return false;
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
      <form method="get" className={styles.filtres}>
        <input
          type="search"
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Nom ou email"
          className={styles.recherche}
        />

        <select name="metier" defaultValue={metier} className={styles.menu}>
          <option value="">Tous les comptes</option>
          {[...metiersPresents.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([cle, n]) => (
              <option key={cle} value={cle}>
                {METIERS[cle] ?? cle} ({n})
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
          <option value="activite">Tri : dernière activité</option>
          <option value="inscription">Tri : date d&apos;inscription</option>
          <option value="projets">Tri : nombre de projets</option>
          <option value="nom">Tri : nom</option>
        </select>

        {/* « Affichage » : les colonnes qu'on ajoute ou retire. */}
        <details className={styles.affichage}>
          <summary>Affichage</summary>
          <div className={styles.cases}>
            {(
              [
                ["etendu", "Profil étendu"],
                ["biofilmo", "Biofilmo"],
                ["inscription", "Date d'inscription"],
                ["activite", "Dernière activité"],
              ] as [string, string][]
            ).map(([cle, l]) => (
              <label key={cle}>
                <input type="checkbox" name="aff" value={cle} defaultChecked={affichage.has(cle)} />
                {l}
              </label>
            ))}
          </div>
        </details>

        <button type="submit" className={formStyles.submit}>
          Filtrer
        </button>
        <Link href="/admin/membres" className={styles.effacer}>
          Tout effacer
        </Link>
      </form>

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
              <th>Membre</th>
              <th>Métier</th>
              {affichage.has("etendu") && <th>Pays · ville</th>}
              {affichage.has("etendu") && <th>Référence</th>}
              <th>Projets</th>
              <th>Formats</th>
              <th>Adhésion</th>
              {affichage.has("biofilmo") && <th>Biofilmo</th>}
              {affichage.has("inscription") && <th>Inscrit</th>}
              {affichage.has("activite") && <th>Dernière activité</th>}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((m) => (
              <tr key={m.profile_id}>
                <td>
                  <Link href={`/membres/${m.profile_id}`}>{m.full_name ?? "Sans nom"}</Link>
                  <br />
                  <span className={formStyles.hint}>{m.email}</span>
                </td>
                <td>
                  {metierDe(m)}
                  {m.est_lecteur && <span className={adminStyles.badge}>lecteur</span>}
                </td>
                {affichage.has("etendu") && (
                  <td>
                    {nomDuPays(m.country)}
                    {m.city ? ` · ${m.city}` : ""}
                  </td>
                )}
                {affichage.has("etendu") && (
                  <td>
                    {m.website ? (
                      <a href={m.website} target="_blank" rel="noopener noreferrer">
                        {m.website.replace(/^https?:\/\/(www\.)?/, "").slice(0, 32)}
                      </a>
                    ) : (
                      <span className={formStyles.hint}>—</span>
                    )}
                  </td>
                )}
                <td>
                  {m.nb_projets}
                  {m.dernier_projet_annee ? (
                    <span className={formStyles.hint}> · {m.dernier_projet_annee}</span>
                  ) : null}
                </td>
                <td>{(m.formats ?? []).map((f) => FORMATS[f] ?? f).join(", ") || "—"}</td>
                <td>{m.adhesion ? m.adhesion.replace("palier_", "") + " €" : "—"}</td>
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
