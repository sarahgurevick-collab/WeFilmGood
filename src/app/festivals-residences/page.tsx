import BarreNav from "@/components/BarreNav";
import EnTeteAnime from "@/components/EnTeteAnime";
import GeneriqueCannes from "@/components/GeneriqueCannes";
import Logo from "@/components/Logo";
import PitchWall from "@/components/PitchWall";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";

export default async function FestivalsResidencesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <EnTeteAnime connecte={!!user} />
      <GeneriqueCannes />
      <PitchWall pitches={[]} />

      <div className={styles.mobile}>
        <Logo size={46} />
        <div className={styles.mobileMarque}>Festivals & Résidences</div>
        <p className={styles.mobileSignature}>
          Retrouvez ici les sélections du Festival de Cannes, année après
          année.
        </p>
      </div>

      <div className={styles.barreNavMobileSeule}>
        <BarreNav connecte={!!user} />
      </div>

      <div className={styles.heroSpace} aria-hidden="true" />
    </>
  );
}
