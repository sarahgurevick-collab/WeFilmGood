import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./PageShell.module.css";

export default function PageShell({
  eyebrow,
  title,
  wide = false,
  theme = "sombre",
  children,
}: {
  eyebrow: string;
  title: string;
  wide?: boolean;
  /** "clair" pour les pages qui se lisent longuement ou qui doivent respirer. */
  theme?: "sombre" | "clair";
  children: ReactNode;
}) {
  return (
    <div className={`${styles.page} ${theme === "clair" ? "clair" : ""}`}>
      <div className={styles.corner}>
        <div>
          <Link href="/">← WeFilmGood</Link>
        </div>
        <div>2026</div>
      </div>
      <main className={`${styles.main} ${wide ? styles.wide : ""}`}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title}>{title}</h1>
        {children}
      </main>
    </div>
  );
}
