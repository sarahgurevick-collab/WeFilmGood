import MasterclassLecteur, {
  type Masterclass,
} from "@/components/MasterclassLecteur";
import PageShell from "@/components/PageShell";
import styles from "./page.module.css";

const MASTERCLASSES: Masterclass[] = [
  { titre: "Paul LAVERTY - Cannes 2016", vimeoId: "168531815" },
  { titre: "Kim NGUYEN - Cannes 2016", vimeoId: "169153806" },
  { titre: "Sacha WOLF - Cannes 2016", vimeoId: "170454805" },
  { titre: "Beatriz SEIGNER Cannes 2018", vimeoId: "281351697" },
  { titre: "Pierre SCHOELLER Clermont-Ferrand 2020", vimeoId: "904082025" },
];

export default function MasterclassPage() {
  return (
    <PageShell eyebrow="WeFilmGood" title="Masterclass">
      <p className={styles.intro}>
        WeFilmGood et La Maison des Scénaristes organisent des masterclass en
        festival afin de partager les expériences des auteurs et des
        réalisateurs. Profitez de ces rares moments en vidéo.
      </p>
      <MasterclassLecteur masterclasses={MASTERCLASSES} />
    </PageShell>
  );
}
