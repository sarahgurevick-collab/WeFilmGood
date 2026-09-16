import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Logo from "@/components/Logo";
import styles from "./partage.module.css";
import { createClient } from "@/lib/supabase/server";

type ProjetPartage = {
  id: string;
  title: string;
  logline: string | null;
  format: string | null;
  country: string | null;
  genre_label: string | null;
  labellise: boolean;
  author_name: string | null;
  vignette_path: string | null;
};

const FORMATS: Record<string, string> = {
  long_metrage: "Long métrage",
  court_metrage: "Court métrage",
  serie: "Série",
  documentaire: "Documentaire",
  animation: "Animation",
  immersif_360_vr: "Format immersif (360/VR)",
};

async function chargerProjet(token: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_shared_project", { p_token: token });
  const projet = ((data ?? []) as ProjetPartage[])[0];
  if (!projet) return null;

  const vignette = projet.vignette_path
    ? supabase.storage.from("project-media").getPublicUrl(projet.vignette_path).data.publicUrl
    : null;

  return { projet, vignette };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const resultat = await chargerProjet(token);
  if (!resultat) return { title: "Projet introuvable" };

  return {
    title: `${resultat.projet.title} — WeFilmGood`,
    description: resultat.projet.logline ?? undefined,
    openGraph: {
      title: resultat.projet.title,
      description: resultat.projet.logline ?? undefined,
      images: resultat.vignette ? [resultat.vignette] : undefined,
    },
  };
}

export default async function ProjetPartagePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const resultat = await chargerProjet(token);

  if (!resultat) {
    notFound();
  }

  const { projet, vignette } = resultat;

  return (
    <div className={styles.page}>
      <main className={styles.contenu}>
        <div className={styles.vignette}>
          {vignette ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={vignette} alt="" />
          ) : (
            <span className={styles.sansImage}>Sans vignette</span>
          )}
        </div>

        {projet.labellise && (
          <div className={styles.label}>
            <Logo size={34} />
            <div>
              <strong>Projet labellisé WeFilmGood</strong>
              <span>
                Sélectionné par un comité de lecture professionnel de la Maison
                des Scénaristes.
              </span>
            </div>
          </div>
        )}

        <h1 className={styles.titre}>{projet.title}</h1>

        <p className={styles.meta}>
          {[
            projet.author_name && `de ${projet.author_name}`,
            projet.genre_label,
            projet.format ? FORMATS[projet.format] ?? projet.format : null,
            projet.country,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>

        {projet.logline && <p className={styles.logline}>{projet.logline}</p>}

        <footer className={styles.pied}>
          <a href="https://www.wefilmgood.com" target="_blank" rel="noopener noreferrer">
            WeFilmGood
          </a>
          <span>La plateforme de rencontres Auteurs — Producteurs</span>
        </footer>
      </main>
    </div>
  );
}
