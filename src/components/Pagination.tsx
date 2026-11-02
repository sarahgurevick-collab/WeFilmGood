"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./Pagination.module.css";

/**
 * La pagination de tout le site (02/11/2026, choix de Sarah) :
 * [ ← Précédent ]  Page [ 14 ▾ ] sur 300  [ Suivant → ]
 * Le menu déroulant permet de sauter loin d'un geste, là où les liens
 * Précédent / Suivant obligeaient à avancer page par page. Un compteur dit
 * ce qui est affiché (« 61 à 120 sur 7 200 ») et un bouton flottant
 * « Remonter en haut » apparaît dès qu'on est descendu.
 *
 * Deux façons de changer de page : `base` (l'adresse de l'écran sans son
 * numéro de page, pour les écrans rendus par le serveur — une fonction ne
 * peut pas passer du serveur au navigateur) ou `surChangement` (la
 * recherche, qui garde ses résultats en mémoire).
 */
export default function Pagination({
  page,
  pages,
  total,
  parPage,
  base,
  surChangement,
  libelle = "Pages",
}: {
  page: number;
  pages: number;
  /** Le nombre total d'éléments, pour le compteur ; sans lui, pas de compteur. */
  total?: number;
  parPage?: number;
  /** L'adresse de l'écran, filtres compris, sans « page » : le numéro s'y ajoute. */
  base?: string;
  surChangement?: (n: number) => void;
  libelle?: string;
}) {
  const router = useRouter();
  if (pages <= 1) return null;

  const lien = base === undefined ? undefined : (n: number) => `${base}${base.includes("?") ? "&" : "?"}page=${n}`;

  const aller = (n: number) => {
    if (n < 1 || n > pages || n === page) return;
    if (surChangement) surChangement(n);
    else if (lien) router.push(lien(n));
  };

  const de = total !== undefined && parPage ? (page - 1) * parPage + 1 : null;
  const a = de !== null && total !== undefined && parPage ? Math.min(total, (page - 1) * parPage + parPage) : null;

  // Précédent / Suivant : un lien quand l'écran a une adresse par page, un bouton sinon.
  const bouton = (n: number, texte: string) => {
    const possible = n >= 1 && n <= pages;
    if (!possible) return <span className={styles.vide} aria-hidden="true" />;
    if (lien && !surChangement) {
      return (
        <Link href={lien(n)} className={styles.lien}>
          {texte}
        </Link>
      );
    }
    return (
      <button type="button" className={styles.lien} onClick={() => aller(n)}>
        {texte}
      </button>
    );
  };

  return (
    <>
      <nav className={styles.pagination} aria-label={libelle}>
        {bouton(page - 1, "← Précédent")}
        <label className={styles.milieu}>
          <span>Page</span>
          <select
            className={styles.choix}
            value={page}
            onChange={(e) => aller(Number(e.currentTarget.value))}
            aria-label="Aller à la page"
          >
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span>sur {pages.toLocaleString("fr-FR")}</span>
          {de !== null && a !== null && total !== undefined && (
            <span className={styles.compteur}>
              {de.toLocaleString("fr-FR")} à {a.toLocaleString("fr-FR")} sur {total.toLocaleString("fr-FR")}
            </span>
          )}
        </label>
        {bouton(page + 1, "Suivant →")}
      </nav>
      <RemonterEnHaut />
    </>
  );
}

/** Le bouton flottant qui ramène en haut, visible seulement une fois descendu. */
function RemonterEnHaut() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const lire = () => setVisible(window.scrollY > 600);
    lire();
    window.addEventListener("scroll", lire, { passive: true });
    return () => window.removeEventListener("scroll", lire);
  }, []);
  if (!visible) return null;
  return (
    <button
      type="button"
      className={styles.remonter}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Remonter en haut"
      title="Remonter en haut"
    >
      ↑
    </button>
  );
}
