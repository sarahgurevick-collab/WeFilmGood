import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { NOM_SOURCE, estAdmin, listerDepots, liensSignes, type Source } from "@/lib/photos-archives";
import { createAdminClient } from "@/lib/supabase/admin";
import NavAdmin from "../NavAdmin";
import styles from "../portraits/portraits.module.css";
import EnvoiExport from "./EnvoiExport";
import GrillePhotos, { type PhotoAffichee } from "./GrillePhotos";

type Ligne = {
  id: string;
  source: Source;
  album: string;
  album_le: string | null;
  prise_le: string | null;
  legende: string | null;
  chemin: string;
  chemin_vignette: string;
  en_ligne: boolean;
};

const COLONNES = "id, source, album, album_le, prise_le, legende, chemin, chemin_vignette, en_ligne";
const dateFr = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" }) : null);

/**
 * Les photos des pages Facebook Maison des Scénaristes et WeFilmGood,
 * copiées sur le serveur (24/10/2026 : le disque dur de Sarah est perdu).
 * Rangées par année puis par album ; Sarah coche celles qui pourront
 * aller sur le site.
 */
export default async function PhotosPage({ searchParams }: { searchParams: Promise<{ album?: string; vue?: string }> }) {
  if (!(await estAdmin())) redirect("/");
  const a = createAdminClient();
  if (!a) redirect("/admin");
  const sp = await searchParams;

  // Toutes les lignes (sans les liens) pour la liste des albums : quelques milliers au plus.
  const toutes: Omit<Ligne, "legende" | "chemin" | "chemin_vignette">[] = [];
  for (let debut = 0; ; debut += 1000) {
    const { data } = await a.from("photos_archives").select("id, source, album, album_le, prise_le, en_ligne").range(debut, debut + 999);
    toutes.push(...((data ?? []) as typeof toutes));
    if (!data || data.length < 1000) break;
  }

  type Album = { cle: string; source: Source; nom: string; annee: number | null; debut: string; n: number; coches: number };
  const albums = new Map<string, Album>();
  for (const l of toutes) {
    const cle = `${l.source}|${l.album}`;
    const quand = l.prise_le ?? l.album_le ?? "";
    const al = albums.get(cle) ?? { cle, source: l.source, nom: l.album, annee: null, debut: quand, n: 0, coches: 0 };
    al.n++;
    if (l.en_ligne) al.coches++;
    if (quand && (!al.debut || quand < al.debut)) al.debut = quand;
    albums.set(cle, al);
  }
  for (const al of albums.values()) al.annee = al.debut ? new Date(al.debut).getFullYear() : null;
  const parAnnee = new Map<string, Album[]>();
  for (const al of [...albums.values()].sort((x, y) => x.debut.localeCompare(y.debut))) {
    const an = al.annee ? String(al.annee) : "Sans date";
    parAnnee.set(an, [...(parAnnee.get(an) ?? []), al]);
  }
  const nCochees = toutes.filter((l) => l.en_ligne).length;

  // Les photos montrées : l'album choisi, ou toutes les photos cochées.
  const vueCochees = sp.vue === "cochees";
  const choisi = !vueCochees && sp.album ? albums.get(sp.album) : undefined;
  let lignes: Ligne[] = [];
  if (vueCochees) {
    const { data } = await a.from("photos_archives").select(COLONNES).eq("en_ligne", true).order("prise_le").limit(1000);
    lignes = (data ?? []) as Ligne[];
  } else if (choisi) {
    const { data } = await a.from("photos_archives").select(COLONNES).eq("source", choisi.source).eq("album", choisi.nom).order("prise_le").limit(2000);
    lignes = (data ?? []) as Ligne[];
  }
  const liens = await liensSignes(lignes.flatMap((l) => [l.chemin_vignette, l.chemin]));
  const photos: PhotoAffichee[] = lignes.map((l) => ({
    id: l.id,
    vignette: liens.get(l.chemin_vignette) ?? null,
    grand: liens.get(l.chemin) ?? null,
    legende: l.legende,
    date: dateFr(l.prise_le),
    enLigne: l.en_ligne,
    album: vueCochees ? l.album : undefined,
  }));

  const depots = await listerDepots();

  return (
    <PageShell nav="admin" avantTitre={<NavAdmin />} title="Photos" theme="clair">
      <EnvoiExport depots={depots} />

      {toutes.length === 0 ? (
        <p className={formStyles.hint}>Aucune photo pour l&apos;instant : elles apparaîtront ici une fois l&apos;export Facebook déposé.</p>
      ) : (
        <>
          <p className={formStyles.hint} style={{ margin: "0 0 12px" }}>
            {toutes.length} photos dans {albums.size} albums · {nCochees} en ligne.{" "}
            <Link href="/admin/photos?vue=cochees">Voir les photos en ligne</Link>
          </p>
          {[...parAnnee].map(([annee, liste]) => (
            <div key={annee} style={{ marginBottom: 14 }}>
              <h2 style={{ fontSize: 16, margin: "0 0 6px" }}>{annee}</h2>
              <div className={styles.onglets}>
                {liste.map((al) => (
                  <Link
                    key={al.cle}
                    href={`/admin/photos?album=${encodeURIComponent(al.cle)}#photos`}
                    className={choisi?.cle === al.cle ? styles.ongletActif : styles.onglet}
                    title={NOM_SOURCE[al.source]}
                  >
                    {al.nom} ({al.n}
                    {al.coches ? ` · ${al.coches} en ligne` : ""})
                  </Link>
                ))}
              </div>
            </div>
          ))}

          <div id="photos">
            {vueCochees && <h2 style={{ fontSize: 20, marginTop: 24 }}>Photos en ligne ({photos.length})</h2>}
            {choisi && (
              <h2 style={{ fontSize: 20, marginTop: 24 }}>
                {choisi.nom} <span style={{ fontWeight: 400, fontSize: 14 }}>· page {NOM_SOURCE[choisi.source]} · {choisi.n} photos</span>
              </h2>
            )}
            {!vueCochees && !choisi && <p className={formStyles.hint}>Choisissez un album.</p>}
            {photos.length > 0 && <GrillePhotos key={choisi?.cle ?? "cochees"} photos={photos} />}
          </div>
        </>
      )}
    </PageShell>
  );
}
