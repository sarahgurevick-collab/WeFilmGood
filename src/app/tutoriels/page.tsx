import { cookies } from "next/headers";
import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { TUTORIELS, langueDuCookie, nomDeFichier } from "./tutoriels";
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
              poster={`/tutoriels/video/${nomDeFichier(t.slug, langue)}.jpg`}
              src={`/tutoriels/video/${nomDeFichier(t.slug, langue)}.mp4`}
            />
          </section>
        ))}
      </div>
    </PageShell>
  );
}
