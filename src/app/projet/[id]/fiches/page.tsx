import CoeurNote from "@/components/CoeurNote";
import ChoixJauge from "@/components/ChoixJauge";
import JaugeSatisfaction from "@/components/JaugeSatisfaction";
import { rateLegacyReport, rateReport } from "../fiche-lecture/actions";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import FicheContent from "@/components/FicheContent";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import { chargerFiches } from "../fiches-donnees";
import FilmsAVoir, { chargerFilmsAVoir } from "../FilmsAVoir";
import PanneauFilmsAVoir from "@/app/admin/fiches/PanneauFilmsAVoir";
import { archivesDuProjet } from "@/lib/archives-lecture";
import styles from "../fiches.module.css";
import Surligne from "@/components/Surligne";
import { contientUnMot, motsDeRecherche } from "@/app/galaxies/mot-trouve";

/**
 * Les fiches de lecture d'un projet, sur une page à part — ouverte dans
 * un nouvel onglet depuis la fiche projet. Réservée à l'auteur et à
 * l'administration.
 */
export default async function FichesDuProjetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { id } = await params;
  // Venue d'une recherche des Galaxies : les mots cherchés en rouge dans
  // les fiches, et la fiche qui les contient ouverte (02/11, Sarah).
  const { q } = await searchParams;
  const mots = motsDeRecherche(q ?? "").map((m) => m.norme);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?next=/projet/${id}/fiches`);

  const { data: projet } = await supabase
    .from("projects")
    .select("title")
    .eq("id", id)
    .maybeSingle<{ title: string }>();
  if (!projet) notFound();

  const fiches = await chargerFiches(supabase, id);
  // L'auteur a ouvert ses analyses : le rappel « Notez cette analyse » de
  // Mes projets peut s'afficher s'il repart sans noter (24/11, Sarah,
  // migration 0327). Sans effet pour l'administration.
  await supabase.rpc("marquer_fiches_lues", { p_project_id: id });
  // La note de l'auteur, sous chaque analyse faite sur WFG 2.
  const { data: projetAMoi } = await supabase
    .from("projects")
    .select("id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();
  const estAuteur = Boolean(projetAMoi);
  const idsPubliees = fiches.filter((f) => f.cle.startsWith("p")).map((f) => f.cle.slice(1));
  const { data: notes } = idsPubliees.length
    ? await supabase.from("reading_report_ratings").select("reading_report_id, stars").in("reading_report_id", idsPubliees)
    : { data: [] };
  const noteDe = new Map((notes ?? []).map((n) => [`p${n.reading_report_id}`, n.stars as number]));
  // Les anciennes fiches portent leur note de WFG 1, ou celle donnée ici.
  for (const f of fiches) if (f.noteAuteur) noteDe.set(f.cle, f.noteAuteur);
  // Les archives de la Maison (Cannes 2016…) : l'administration seulement,
  // jamais l'auteur — même présentation, « ARCHIVE » à la place de la
  // synthèse de lecture (31/10, Sarah).
  const { data: estAdmin } = await supabase.rpc("is_admin");
  const archives = estAdmin === true ? await archivesDuProjet(id) : [];
  const filmsAVoir = await chargerFilmsAVoir(supabase, id);
  const dateFr = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "Date inconnue";

  return (
    <PageShell
      avantTitre={
        <p className={formStyles.linkRow} style={{ marginBottom: 16 }}>
          <Link href={`/projet/${id}`}>← Retour au projet</Link>
        </p>
      }
      eyebrow="Fiches de lecture"
      title={projet.title}
    >
      {fiches.length === 0 && archives.length === 0 ? (
        <p className={formStyles.hint}>
          Les fiches de lecture sont confidentielles : seuls l&apos;auteur du projet et
          l&apos;équipe WeFilmGood peuvent les lire.
        </p>
      ) : (
        <>
          {fiches.length > 0 && (
          <p className={formStyles.hint}>
            {fiches.length === 1
              ? "Une lecture a été faite sur ce projet."
              : `${fiches.length} lectures ont été faites sur ce projet, de la plus récente à la plus ancienne.`}{" "}
            Elles sont confidentielles : seuls l&apos;auteur et l&apos;équipe WeFilmGood les
            lisent.
          </p>
          )}
          {fiches.map((f, i) => (
            <details key={f.cle} open={i === 0 || contientUnMot(f.contenu, mots) || contientUnMot(f.avis, mots)} className={styles.fiche}>
              <summary>
                {f.date
                  ? new Date(f.date).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "Date inconnue"}
                {/* L'auteur ne voit la note sur 200 que si elle vaut le label
                    (plus de 150) ; en dessous, la note reste à
                    l'administration (24/11, Sarah). */}
                {f.note !== null && (estAdmin === true || f.note > 150) && (
                  <span style={{ fontWeight: 400 }}>
                    {" — "}
                    {f.note}/200
                    {f.note > 150 && " · labellisé"}
                    <CoeurNote note={f.note} />
                  </span>
                )}
              </summary>
              {f.html ? (
                <FicheContent html={f.contenu} mots={mots} />
              ) : (
                f.contenu && <p style={{ whiteSpace: "pre-wrap", marginTop: 12 }}><Surligne texte={f.contenu} mots={mots} /></p>
              )}
              {f.avis && (
                <>
                  <p className={formStyles.hint} style={{ marginTop: 16, marginBottom: 4 }}>
                    Avis WeFilmGood
                  </p>
                  <p style={{ whiteSpace: "pre-wrap", margin: 0 }}><Surligne texte={f.avis} mots={mots} /></p>
                </>
              )}
              {noteDe.has(f.cle) ? (
                <p className={formStyles.hint} style={{ marginTop: 24 }}>
                  Vous avez attribué <JaugeSatisfaction position={noteDe.get(f.cle)!} taille={36} /> à cette
                  fiche de lecture.
                </p>
              ) : estAuteur ? (
                // Le cercle sous chaque analyse sans note, ancienne (WFG 1,
                // sans rappel) ou nouvelle : chaque lecteur a sa note, une
                // bonne fiche ne paie pas pour une autre (24/11, Sarah).
                <form action={f.cle.startsWith("p") ? rateReport : rateLegacyReport} style={{ marginTop: 24 }}>
                  <input type="hidden" name={f.cle.startsWith("p") ? "report_id" : "legacy_review_id"} value={f.cle.slice(1)} />
                  <input type="hidden" name="project_id" value={id} />
                  <input type="hidden" name="retour" value={`/projet/${id}/fiches`} />
                  <div className={formStyles.field}>
                    <span>Notez cette analyse</span>
                    <div>
                      <ChoixJauge taille={132} envoiDirect />
                    </div>
                  </div>
                </form>
              ) : null}
            </details>
          ))}
          {archives.map((a, i) => (
            <details key={a.id} open={(fiches.length === 0 && i === 0) || contientUnMot(a.texte, mots)} className={styles.fiche}>
              <summary>
                {dateFr(a.recue_le)}
                <span style={{ fontWeight: 400 }}>
                  {" — "}ARCHIVE{a.appel ? ` · ${a.appel}` : ""}
                </span>
              </summary>
              <p style={{ marginTop: 12, marginBottom: 0 }}>
                <strong>ARCHIVE{a.lecteur ? ` : ${a.lecteur}` : ""}</strong>
              </p>
              {a.texte && (
                <p style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>
                  <Surligne texte={a.texte.replace(/^\s*Fiche de lecture\s*\n/i, "").trim()} mots={mots} />
                </p>
              )}
              {a.message_lecteur && (
                <>
                  <p className={formStyles.hint} style={{ marginTop: 16, marginBottom: 4 }}>
                    Message du lecteur avec la fiche
                  </p>
                  <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{a.message_lecteur}</p>
                </>
              )}
              {a.lien && (
                <p className={formStyles.hint} style={{ marginTop: 16, marginBottom: 0 }}>
                  <a href={a.lien} target="_blank" rel="noreferrer">
                    Document d&apos;origine
                  </a>{" "}
                  — visible de l&apos;administration seulement
                </p>
              )}
            </details>
          ))}
        </>
      )}
      <FilmsAVoir films={filmsAVoir} />
      {estAdmin === true && <PanneauFilmsAVoir projectId={id} retour={`/projet/${id}/fiches`} />}
    </PageShell>
  );
}
