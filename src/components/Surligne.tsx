import { decouper } from "@/app/galaxies/mot-trouve";
import styles from "./surligne.module.css";

/** Le texte, les mots cherchés en rouge (02/11, Sarah). Sans mot : le texte tel quel. */
export default function Surligne({ texte, mots }: { texte: string; mots: string[] }) {
  if (!mots.length) return <>{texte}</>;
  return (
    <>
      {decouper(texte, mots).map((m, i) =>
        m.trouve ? (
          <mark key={i} className={styles.mot}>{m.texte}</mark>
        ) : (
          <span key={i}>{m.texte}</span>
        ),
      )}
    </>
  );
}
