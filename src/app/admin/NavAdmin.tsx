"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./admin.module.css";

const PAGES = [
  { href: "/admin/projets-en-attente", libelle: "Assignation" },
  { href: "/admin/profils", libelle: "Profils" },
  { href: "/admin/fiches", libelle: "Toutes les fiches" },
  { href: "/admin/adhesions", libelle: "Adhésions" },
];

/**
 * La barre des pages d'administration, en tête de chacune : la page en
 * cours est soulignée, pour savoir où l'on est. Les codes lecteurs, qui
 * ne servent que deux ou trois fois par an, sont derrière la clé.
 */
export default function NavAdmin() {
  const chemin = usePathname() ?? "";
  // La relecture d'une fiche (/admin/fiches/…) se fait depuis l’assignation.
  const actif = (href: string) =>
    href === "/admin/fiches"
      ? chemin === href
      : chemin.startsWith(href) ||
        (href === "/admin/projets-en-attente" &&
          chemin.startsWith("/admin/fiches/"));

  return (
    <nav className={styles.navAdmin} aria-label="Administration">
      {PAGES.map((p) => (
        <Link
          key={p.href}
          href={p.href}
          className={actif(p.href) ? styles.navActif : styles.navLien}
          aria-current={actif(p.href) ? "page" : undefined}
        >
          {p.libelle}
        </Link>
      ))}
      <Link
        href="/admin/codes"
        className={`${styles.navCle} ${actif("/admin/codes") ? styles.navCleActive : ""}`}
        title="Codes lecteurs"
        aria-label="Codes lecteurs"
        aria-current={actif("/admin/codes") ? "page" : undefined}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="7.5" cy="15.5" r="5.5" />
          <path d="m21 2-9.6 9.6" />
          <path d="m15.5 7.5 3 3L22 7l-3-3" />
        </svg>
      </Link>
    </nav>
  );
}
