import MasterclassLecteur, {
  type Masterclass,
} from "@/components/MasterclassLecteur";
import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";

const MASTERCLASSES: Masterclass[] = [
  { titre: "Jacques FIESCHI - Cannes 2012", vimeoId: "669374688" },
  {
    titre: "Salvatore LISTA - Cannes 2014",
    vimeoId: "669771058",
    teaser: "https://www.youtube.com/watch?v=t77nPp14rDs",
    film: "Mange tes morts : tu ne diras point (Jean-Charles HUE)",
  },
  {
    titre: "Israël HOROWITZ - Cannes 2015",
    vimeoId: "1236608372",
    teaser: "https://www.youtube.com/watch?v=a50XaMJ043g",
    film: "My Old Lady",
    affiche: "/masterclass/my-old-lady.webp",
  },
  {
    titre: "Thomas BIDEGAIN & Noé DEBRÉ - Cannes 2015",
    vimeoId: "1236608373",
    teaser: "https://www.youtube.com/watch?v=hDHmsbibUWY",
    film: "Les Cowboys",
    affiche: "/masterclass/les-cowboys.webp",
  },
  { titre: "Jeremy SAULNIER - Cannes 2015", vimeoId: "1237071653", teaser: "https://www.youtube.com/watch?v=yKdVYUXyBzU", film: "Green Room", affiche: "/masterclass/green-room.webp" },
  { titre: "Chris SPARLING - Cannes 2015", vimeoId: "1237374644", teaser: "https://www.youtube.com/watch?v=PQvC9V1eLsE", film: "The Sea of Trees (Gus VAN SANT)", affiche: "/masterclass/the-sea-of-trees.webp" },
  { titre: "Paul LAVERTY - Cannes 2016", vimeoId: "168531815", teaser: "https://www.youtube.com/watch?v=2BK4jRYx0Ps", film: "I, Daniel Blake (Ken LOACH)", affiche: "/masterclass/i-daniel-blake.webp" },
  { titre: "Kim NGUYEN - Cannes 2016", vimeoId: "169153806", teaser: "https://www.youtube.com/watch?v=cFyg2AuD86M", film: "Two Lovers and a Bear", affiche: "/masterclass/two-lovers-and-a-bear.webp" },
  { titre: "Sacha WOLFF - Cannes 2016", vimeoId: "170454805", teaser: "https://www.youtube.com/watch?v=AjtL-KAxXD0", film: "Mercenaire", affiche: "/masterclass/mercenaire.webp" },
  { titre: "David BIRKE - Cannes 2016", vimeoId: "170676380", teaser: "https://www.youtube.com/watch?v=gM96ne-XiH0", film: "Elle (Paul VERHOEVEN)", affiche: "/masterclass/elle.webp" },
  {
    titre: "Brian SZELNICK - Cannes 2017",
    vimeoId: "220287202",
    teaser: "https://www.youtube.com/watch?v=0tpPeyYB8pc",
    film: "Wonderstruck (Todd HAYNES)",
    affiche: "/masterclass/wonderstruck.webp",
  },
  {
    titre: "Anahita GHAZVINIZADEH - Cannes 2017",
    vimeoId: "220597607",
    teaser: "https://www.youtube.com/watch?v=PFO_4hLcszI",
    film: "They",
    affiche: "/masterclass/they.webp",
  },
  {
    titre: "Beatriz SEIGNER - Cannes 2018",
    vimeoId: "281351697", teaser: "https://www.youtube.com/watch?v=A6jBRLMwRMo",
    film: "Los Silencios",
    affiche: "/masterclass/los-silencios.webp",
  },
  {
    titre: "Romain GAVRAS - Cannes 2018",
    vimeoId: "277538414", teaser: "https://www.youtube.com/watch?v=NNtZdPNQuQQ",
    film: "Le monde est à toi",
    affiche: "/masterclass/le-monde-est-a-toi.webp",
  },
  {
    titre: "Abu BAKR SHAWKY - Cannes 2018",
    vimeoId: "279861719", teaser: "https://www.youtube.com/watch?v=4p072xiJcBY",
    film: "Yomeddine",
    affiche: "/masterclass/yomeddine.webp",
  },
  {
    titre: "Andrea BESCOND & Eric METAYER - Cannes 2018",
    vimeoId: "1236601048", teaser: "https://www.youtube.com/watch?v=w-GevIj7n9s",
    film: "Les Chatouilles",
    affiche: "/masterclass/les-chatouilles.webp",
  },
  {
    titre: "Paul LAVERTY - Cannes 2019",
    vimeoId: "338559739", teaser: "https://www.youtube.com/watch?v=F7aj7NrKrlQ",
    film: "Sorry We Missed You (Ken LOACH)",
    affiche: "/masterclass/sorry-we-missed-you.webp",
  },
  {
    titre: "Alice FURTADO & Leonardo LEVIS - Cannes 2019",
    vimeoId: "1227885383", teaser: "https://www.youtube.com/watch?v=QynjjkMHlUU",
    film: "Sick Sick Sick",
    affiche: "/masterclass/sick-sick-sick.webp",
  },
  { titre: "Melina LEON - Cannes 2019", vimeoId: "1227885384", teaser: "https://www.youtube.com/watch?v=E7UyDw1h6ag", film: "Canción sin nombre", affiche: "/masterclass/cancion-sin-nombre.webp" },
  { titre: "Larisa SADILOVA - Cannes 2019", vimeoId: "1227885382", teaser: "https://www.youtube.com/watch?v=gdvJGoVua2s", film: "Once in Trubchevsk", affiche: "/masterclass/once-in-trubchevsk.webp" },
  { titre: "Gérard KRAWCZYK - Clermont-Ferrand 2014", vimeoId: "1236608380" },
  { titre: "Olivier MEGATON - Clermont-Ferrand 2016", vimeoId: "164111497" },
  { titre: "Julien SERI - Clermont-Ferrand 2017", vimeoId: "206539679" },
  { titre: "Hong-Jin NA - Clermont-Ferrand 2018", vimeoId: "305807052" },
  { titre: "David OELHOFFEN - Clermont-Ferrand 2019", vimeoId: "340089009" },
  { titre: "Pierre SCHOELLER - Clermont-Ferrand 2020", vimeoId: "904082025" },
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
