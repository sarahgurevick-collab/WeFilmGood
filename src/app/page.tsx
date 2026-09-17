import type { CSSProperties } from "react";
import Link from "next/link";
import BarreNav from "@/components/BarreNav";
import Compteur from "@/components/Compteur";
import HashSession from "@/components/HashSession";
import Logo from "@/components/Logo";
import PitchWall, { type Pitch } from "@/components/PitchWall";
import RechercheDemo from "@/components/RechercheDemo";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";

const DOTS = [0, 45, 90, 135, 180, 225, 270, 315];

export default async function Home() {
  const supabase = await createClient();

  // Tant que la table n'existe pas, `error` est renseigné et la page
  // s'affiche avec les aplats : rien ne casse.
  const { data } = await supabase
    .from("pitches")
    .select("id, vimeo_id, title")
    .eq("is_featured", true)
    .order("position", { ascending: true })
    .limit(25);

  const pitches: Pitch[] = data ?? [];

  const [{ count }, { data: auth }] = await Promise.all([
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("is_public", true),
    supabase.auth.getUser(),
  ]);

  return (
    <>
      <HashSession />
      <PitchWall pitches={pitches} />

      <div className={styles.mobile}>
        <Logo size={46} />
        <div className={styles.mobileMarque}>WeFilmGood</div>
        <p className={styles.mobileSignature}>
          The best stories wherever they are
        </p>
        {count ? (
          <p className={styles.mobileCompte}>
            {count} projet{count > 1 ? "s" : ""} dans la pitchothèque
          </p>
        ) : null}
        <Link href="/projets" className={styles.mobileBouton}>
          Voir les projets
        </Link>
      </div>

      <BarreNav connecte={!!auth?.user} />

      <div className={styles.ui}>
        <div className={`${styles.corner} ${styles.topLeft}`}>
          <div>WeFilmGood</div>
          <div>2026</div>
        </div>

        <div className={styles.loader} aria-hidden="true">
          {DOTS.map((a, i) => (
            <i
              key={a}
              style={{ "--a": `${a}deg`, "--ad": `${i * 0.2}s` } as CSSProperties}
            />
          ))}
        </div>

        <div className={styles.hero}>
          <Compteur valeur={10} label="ans" />
        </div>

        <div className={`${styles.corner} ${styles.topCenter}`}>
          <Link href="/deposer">Déposer</Link>
        </div>
        <div className={`${styles.corner} ${styles.topRight}`}>
          <Link href="/menu">Menu</Link>
        </div>

        <div className={styles.statsBar}>
          <Compteur valeur={9170} label="Scénarios analysés" />
          <Compteur valeur={1325} label="Projets labellisés" />
          <Compteur valeur={135} label="Pays connectés" />
          <Compteur valeur={13058} label="talents" />
        </div>
      </div>

      <div className={styles.heroSpace} aria-hidden="true" />

      <section className={`${styles.bande} clair`}>
        <h2 className={styles.bandeTitre}>
          Rejoignez <span className={styles.rouge}>We</span>Film<span className={styles.rouge}>Good</span> la
          plateforme de la Maison des Scénaristes
        </h2>
        <p className={styles.bandeSousTitre}>
          Créons ensemble les Films et les Séries de demain !
        </p>
        <RechercheDemo />
      </section>
    </>
  );
}
