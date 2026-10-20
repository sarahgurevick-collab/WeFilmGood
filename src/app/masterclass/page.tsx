import MasterclassLecteur, {
  type Masterclass,
} from "@/components/MasterclassLecteur";
import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";

const MASTERCLASSES: Masterclass[] = [
  { titre: "Jacques FIESCHI - Cannes 2012", vimeoId: "669374688" },
  { titre: "Israël HOROWITZ - Cannes 2015", vimeoId: "1236608372" },
  { titre: "Thomas BIDEGAIN & Noé DEBRÉ - Cannes 2015", vimeoId: "1236608373" },
  { titre: "Jeremy SAULNIER - Cannes 2015", vimeoId: "1237071653", film: "Green Room" },
  { titre: "Chris SPARLING - Cannes 2015", vimeoId: "1237374644", film: "The Sea of Trees (Gus VAN SANT)" },
  { titre: "Paul LAVERTY - Cannes 2016", vimeoId: "168531815", film: "I, Daniel Blake (Ken LOACH)" },
  { titre: "Kim NGUYEN - Cannes 2016", vimeoId: "169153806", film: "Two Lovers and a Bear" },
  { titre: "Sacha WOLFF - Cannes 2016", vimeoId: "170454805", film: "Mercenaire" },
  { titre: "David BIRKE - Cannes 2016", vimeoId: "170676380", film: "Elle (Paul VERHOEVEN)" },
  { titre: "Brian SZELNICK - Cannes 2017", vimeoId: "220287202" },
  { titre: "Anahita GHAZVINIZADEH - Cannes 2017", vimeoId: "220597607" },
  { titre: "Beatriz SEIGNER Cannes 2018", vimeoId: "281351697" },
  { titre: "Romain GAVRAS - Cannes 2018", vimeoId: "277538414" },
  { titre: "Abu BAKR SHAWKY - Cannes 2018", vimeoId: "279861719" },
  { titre: "Andrea BESCOND & Eric METAYER - Cannes 2018", vimeoId: "1236601048" },
  {
    titre: "Paul LAVERTY 2 - Cannes 2019",
    vimeoId: "338559739",
    film: "Sorry We Missed You (Ken LOACH)",
    affiche: "/masterclass/sorry-we-missed-you.webp",
  },
  {
    titre: "Alice FURTADO & Leonardo LEVIS - Cannes 2019",
    vimeoId: "1227885383",
    film: "Sick Sick Sick",
    affiche: "/masterclass/sick-sick-sick.webp",
  },
  { titre: "Melina LEON - Cannes 2019", vimeoId: "1227885384", film: "Canción sin nombre" },
  { titre: "Larisa SADILOVA - Cannes 2019", vimeoId: "1227885382", film: "Once in Trubchevsk" },
  { titre: "Gérard KRAWCZYK - Clermont-Ferrand 2014", vimeoId: "1236608380" },
  { titre: "Olivier MEGATON - Clermont-Ferrand 2016", vimeoId: "164111497" },
  { titre: "Julien SERI - Clermont-Ferrand 2017", vimeoId: "206539679" },
  { titre: "Hong-Jin NA - Clermont-Ferrand 2018", vimeoId: "305807052" },
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
      {/* À l'arrivée, Paul Laverty 2 (Cannes 2019) : la première de 2012
          n'est pas la meilleure (15/10, Sarah). */}
      <MasterclassLecteur masterclasses={MASTERCLASSES} parDefaut="338559739" />
    </PageShell>
  );
}
