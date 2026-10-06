import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { signerImages } from "@/app/projet/[id]/fichiers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import NavAdmin from "../NavAdmin";
import BoutonRetirer from "./BoutonRetirer";
import { retirerPortrait, validerPortrait } from "./actions";
import styles from "./portraits.module.css";

const PAR_PAGE = 24;

type Avis = "moyen" | "bon" | "rien";

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

/**
 * Les portraits que WeFilmGood a posés sur les personnages (Pixabay, et
 * Wikipédia pour les personnes réelles), à relire sur la plateforme même
 * plutôt que dans un fichier (06/10, demande de Sarah). Les « moyens »
 * d'abord : ce sont ceux qu'elle regarde un par un. L'onglet « Sans
 * portrait » liste les personnages restés sans photo, avec les recherches
 * Adobe Stock et Unsplash en boutons (les liens des fiches à télécharger).
 * Le suivi n'est lisible qu'avec la clé de service, ouverte ici après la
 * vérification admin.
 */

/** Les recherches toutes prêtes, avec les mots anglais qui ont servi chez Pixabay. */
function recherches(requete: string | null) {
  const mots = (requete ?? "").trim();
  if (!mots || mots.startsWith("WIKI:")) return null;
  return {
    adobe: `https://stock.adobe.com/fr/search/free?k=${encodeURIComponent(mots)}`,
    unsplash: `https://unsplash.com/fr/s/photos/${encodeURIComponent(mots.replace(/\s+/g, "-"))}`,
  };
}
export default async function PortraitsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ avis?: string; page?: string }>;
}) {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) redirect("/");
  const admin = createAdminClient();
  if (!admin) redirect("/admin");

  const sp = await searchParams;
  const avis: Avis = sp.avis === "bon" ? "bon" : sp.avis === "rien" ? "rien" : "moyen";
  const page = Math.max(1, Math.floor(Number(sp.page)) || 1);

  // « Sans portrait » : pas de source, puisqu'aucune photo n'a été retenue.
  const compter = async (a: Avis) => {
    const q = admin
      .from("portraits_suivi")
      .select("character_id", { count: "exact", head: true })
      .eq("avis", a);
    return ((a === "rien" ? await q : await q.not("source", "is", null)).count ?? 0);
  };
  const [nMoyens, nBons, nRien] = await Promise.all([compter("moyen"), compter("bon"), compter("rien")]);
  const total = avis === "moyen" ? nMoyens : avis === "bon" ? nBons : nRien;
  const nbPages = Math.max(1, Math.ceil(total / PAR_PAGE));

  const requeteSuivis = admin
    .from("portraits_suivi")
    .select("character_id, lot, note, requete, traite_le")
    .eq("avis", avis);
  const { data: suivis } = await (avis === "rien" ? requeteSuivis : requeteSuivis.not("source", "is", null))
    .order("traite_le", { ascending: false })
    .order("character_id", { ascending: true })
    .range((page - 1) * PAR_PAGE, page * PAR_PAGE - 1)
    .returns<{ character_id: string; lot: string; note: string | null; requete: string | null; traite_le: string }[]>();

  const ids = (suivis ?? []).map((s) => s.character_id);
  const { data: persos } = ids.length
    ? await admin
        .from("characters")
        .select("id, name, biography, photo_path, photo_x, photo_y, photo_proposee, project:projects(id, title)")
        .in("id", ids)
        .returns<Perso[]>()
    : { data: [] as Perso[] };
  const parId = new Map((persos ?? []).map((p) => [p.id, p]));
  const urls = await signerImages(admin, (persos ?? []).map((p) => p.photo_path));

  // Un portrait que l'auteur a remplacé depuis n'est plus à relire ; un
  // personnage qui a reçu une photo depuis n'est plus « sans portrait ».
  const cartes = (suivis ?? []).flatMap((s) => {
    const p = parId.get(s.character_id);
    if (!p) return [];
    if (avis === "rien") return p.photo_path ? [] : [{ s, p, url: null as string | null }];
    if (!p.photo_proposee || !p.photo_path) return [];
    return [{ s, p, url: urls.get(p.photo_path) ?? null }];
  });

  const lien = (a: Avis, n = 1) => `/admin/portraits?avis=${a}${n > 1 ? `&page=${n}` : ""}`;

  return (
    <PageShell nav="admin" avantTitre={<NavAdmin />} title="Portraits proposés" theme="clair">
      <div className={styles.onglets}>
        <Link href={lien("moyen")} className={avis === "moyen" ? styles.ongletActif : styles.onglet}>
          Moyens ({nMoyens})
        </Link>
        <Link href={lien("bon")} className={avis === "bon" ? styles.ongletActif : styles.onglet}>
          Bons ({nBons})
        </Link>
        <Link href={lien("rien")} className={avis === "rien" ? styles.ongletActif : styles.onglet}>
          Sans portrait ({nRien})
        </Link>
      </div>

      {cartes.length === 0 ? (
        <p className={formStyles.hint}>Aucun portrait dans cette liste.</p>
      ) : (
        <ul className={styles.grille}>
          {cartes.map(({ s, p, url }) => (
            <li key={p.id} className={styles.carte}>
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt=""
                  className={styles.photo}
                  loading="lazy"
                  style={{ objectPosition: `${p.photo_x}% ${p.photo_y}%` }}
                />
              ) : (
                <div className={styles.photo} />
              )}
              <h2 className={styles.nom}>{p.name}</h2>
              {p.project && <p className={styles.projet}>« {p.project.title} »</p>}
              {s.note && <p className={styles.note}>{s.note}</p>}
              {p.biography && (
                <p className={styles.bio}>
                  {p.biography.length > 200 ? `${p.biography.slice(0, 200).trimEnd()}…` : p.biography}
                </p>
              )}
              {avis !== "bon" && recherches(s.requete) && (
                <div className={styles.recherches}>
                  <a href={recherches(s.requete)!.adobe} target="_blank" rel="noopener noreferrer" className={styles.chercher}>
                    Chercher sur Adobe Stock (gratuit)
                  </a>
                  <a href={recherches(s.requete)!.unsplash} target="_blank" rel="noopener noreferrer" className={styles.chercher}>
                    Chercher sur Unsplash
                  </a>
                  <p className={styles.lot}>Recherche : {s.requete}</p>
                </div>
              )}
              <p className={styles.lot}>{s.lot}</p>
              <div className={styles.actions}>
                {avis === "moyen" && (
                  <form action={validerPortrait}>
                    <input type="hidden" name="character_id" value={p.id} />
                    <button type="submit" className={styles.valider}>
                      Valider
                    </button>
                  </form>
                )}
                {avis !== "rien" && (
                  <form action={retirerPortrait}>
                    <input type="hidden" name="character_id" value={p.id} />
                    <BoutonRetirer />
                  </form>
                )}
                {p.project && (
                  <Link href={`/projet/${p.project.id}/personnages`} className={styles.ouvrir}>
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
          {page > 1 && <Link href={lien(avis, page - 1)}>← Précédente</Link>}
          <span className={formStyles.hint}>
            Page {page} sur {nbPages}
          </span>
          {page < nbPages && <Link href={lien(avis, page + 1)}>Suivante →</Link>}
        </div>
      )}
    </PageShell>
  );
}
