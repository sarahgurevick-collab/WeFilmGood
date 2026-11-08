import { stat } from "node:fs/promises";
import { join } from "node:path";
import { cookies } from "next/headers";
import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { DOSSIER_TUTORIELS, TUTORIELS, langueDuCookie, nomDeFichier } from "./tutoriels";
import styles from "./tutoriels.module.css";

/**
 * Les tutoriels : de courtes vidéos, un écran toutes les quatre secondes,
 * faites avec le compte de test (08/11/2026). Un visiteur ne voit que la
 * connexion ; les vidéos qui montrent l'intérieur du site attendent qu'il
 * soit connecté.
 */
export default async function TutorielsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const visibles = TUTORIELS.filter((t) => !t.membres || user);
  // Site passé en anglais par le globe : les films anglais, avec leur titre.
  const langue = langueDuCookie((await cookies()).get("googtrans")?.value);
  // La date du fichier dans l'adresse : un film refait est repris aussitôt
  // par le navigateur au lieu de la copie qu'il gardait (Sarah, 08/11, voyait
  // encore l'ancien écran 8 une heure après le remplacement).
  const versions = new Map<string, string>();
  await Promise.all(
    visibles.flatMap((t) => {
      const nom = nomDeFichier(t.slug, langue);
      return ["mp4", "jpg"].map(async (ext) => {
        try {
          versions.set(`${nom}.${ext}`, String(Math.round((await stat(join(DOSSIER_TUTORIELS, `${nom}.${ext}`))).mtimeMs)));
        } catch {
          versions.set(`${nom}.${ext}`, "0");
        }
      });
    }),
  );
  const adresse = (nom: string) => `/tutoriels/video/${nom}?v=${versions.get(nom) ?? "0"}`;

  return (
    <PageShell eyebrow="WeFilmGood" title="Tutoriels" enTeteAnime connecte={!!user}>
      <div className={styles.liste}>
        {visibles.map((t) => (
          <section key={t.slug} id={t.slug} className={styles.carte}>
            <h2 className={styles.titre}>{langue === "en" ? t.titreEn : t.titre}</h2>
            <video
              className={styles.video}
              controls
              preload="metadata"
              playsInline
              poster={adresse(`${nomDeFichier(t.slug, langue)}.jpg`)}
              src={adresse(`${nomDeFichier(t.slug, langue)}.mp4`)}
            />
          </section>
        ))}
      </div>
    </PageShell>
  );
}
