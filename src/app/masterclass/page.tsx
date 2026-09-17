import MasterclassLecteur, {
  type Masterclass,
} from "@/components/MasterclassLecteur";
import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";

const MASTERCLASSES: Masterclass[] = [
  { titre: "Jacques FIESCHI - Cannes 2012", vimeoId: "669374688" },
  { titre: "Paul LAVERTY - Cannes 2016", vimeoId: "168531815" },
  { titre: "Kim NGUYEN - Cannes 2016", vimeoId: "169153806" },
  { titre: "Sacha WOLF - Cannes 2016", vimeoId: "170454805" },
  { titre: "David BIRKE - Cannes 2016", vimeoId: "170676380" },
  { titre: "Brian SZELNICK - Cannes 2017", vimeoId: "220287202" },
  { titre: "Anahita GHAZVINIZADEH - Cannes 2017", vimeoId: "220597607" },
  { titre: "Beatriz SEIGNER Cannes 2018", vimeoId: "281351697" },
  { titre: "Romain GAVRAS - Cannes 2018", vimeoId: "277538414" },
  { titre: "Abu BAKR SHAWKY - Cannes 2018", vimeoId: "279861719" },
  { titre: "Paul LAVERTY 2 - Cannes 2019", vimeoId: "338559739" },
  { titre: "Alice FURTADO & Leonardo LEVIS - Cannes 2019", vimeoId: "1227885383" },
  { titre: "Olivier MEGATON - Clermont-Ferrand 2016", vimeoId: "164111497" },
  { titre: "Julien SERI - Clermont-Ferrand 2017", vimeoId: "206539679" },
  { titre: "David OELHOFFEN - Clermont-Ferrand 2019", vimeoId: "340089009" },
  { titre: "Pierre SCHOELLER Clermont-Ferrand 2020", vimeoId: "904082025" },
];

export default async function MasterclassPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <PageShell
      eyebrow="WeFilmGood"
      title="Masterclass"
      enTeteAnime
      connecte={!!user}
    >
      <p className={styles.intro}>
        WeFilmGood et La Maison des Scénaristes organisent des masterclass en
        festival afin de partager les expériences des auteurs et des
        réalisateurs. Profitez de ces rares moments en vidéo.
      </p>
      <MasterclassLecteur masterclasses={MASTERCLASSES} />
    </PageShell>
  );
}
