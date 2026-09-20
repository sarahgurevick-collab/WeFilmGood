import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import LabelWFG from "@/components/LabelWFG";
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

  // Le projet est partagé, donc la règle de stockage laisse passer la
  // signature même pour un visiteur sans compte.
  const { data: signe } = projet.vignette_path
    ? await supabase.storage.from("project-media").createSignedUrl(projet.vignette_path, 60 * 60)
    : { data: null };
  const vignette = signe?.signedUrl ?? null;

  // Le nombre de projets est l'argument le plus concret pour un producteur
  // qui découvre la plateforme. On ne l'affiche que s'il est parlant.
  const { count } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("is_public", true);

  return { projet, vignette, nombreProjets: count ?? 0 };
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
    // Cette page est destinée à un producteur précis, pas à une
    // recherche : elle ne doit jamais apparaître dans un moteur.
    robots: { index: false, follow: false },
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

  const { projet, vignette, nombreProjets } = resultat;

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
            <LabelWFG taille={40} />
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

        <section className={styles.invitation}>
          <Logo size={30} />
          <h2>Ce projet vous intéresse&nbsp;?</h2>
          <p>
            Créez votre profil pour contacter {projet.author_name ?? "l'auteur"}
            {nombreProjets > 1
              ? ` et découvrir les ${nombreProjets} projets de la pitchothèque.`
              : " et découvrir la pitchothèque."}
          </p>
          <Link href="/inscription" className={styles.bouton}>
            Créer mon profil
          </Link>
          <span className={styles.signature}>
            WeFilmGood — La plateforme de rencontres Auteurs&nbsp;·&nbsp;Producteurs de la
            Maison des Scénaristes
          </span>
        </section>
      </main>
    </div>
  );
}
