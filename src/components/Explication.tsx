import type { CSSProperties, ReactNode } from "react";
import styles from "./Explication.module.css";

/**
 * Une phrase grise d'explication de la plateforme (24/11/2026, Sarah) :
 * tant que le bloc n'est pas rempli, elle reste sous les yeux ; une fois
 * qu'on a compris comment cela fonctionne (bloc rempli), elle se range
 * derrière un petit « ? » qu'un clic rouvre. Le texte ne change pas.
 */
export default function Explication({
  repliee,
  style,
  children,
}: {
  /** Le bloc est rempli : la phrase se range derrière le « ? ». */
  repliee: boolean;
  /** La marge de la phrase, reportée sur le « ? » une fois rangée. */
  style?: CSSProperties;
  children: ReactNode;
}) {
  if (!repliee) return <>{children}</>;
  return (
    <details className={styles.repli} style={style}>
      <summary aria-label="Explication">?</summary>
      {children}
    </details>
  );
}
