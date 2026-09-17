import MasterclassLecteur, {
  type Masterclass,
} from "@/components/MasterclassLecteur";
import PageShell from "@/components/PageShell";
import styles from "./page.module.css";

// En attente de la vraie liste (titre + identifiant Vimeo) des masterclass.
const MASTERCLASSES: Masterclass[] = [
  { titre: "Exemple à remplacer", vimeoId: "281351697" },
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
