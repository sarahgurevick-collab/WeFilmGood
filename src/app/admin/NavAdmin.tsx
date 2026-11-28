"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./admin.module.css";

// Les six premières, les plus utilisées, sont plus grosses et seules sur la première ligne.
const NB_PRINCIPALES = 6;

const PAGES = [
  { href: "/admin/projets-en-attente", libelle: "Projets en attente" },
  { href: "/admin/fiches-a-valider", libelle: "Fiches à valider" },
  { href: "/admin/fiches", libelle: "Projets" },
  { href: "/admin/videopitchs", libelle: "StoryPitchs" },
  { href: "/admin/membres", libelle: "Membres" },
  { href: "/admin/cinecrush", libelle: "CinéCrush" },
  { href: "/admin/mailing", libelle: "Mailing" },
  { href: "/admin/archives-lecture", libelle: "Archives de lecture" },
  { href: "/admin/statistiques", libelle: "Statistiques" },
  { href: "/admin/femme-homme", libelle: "Femme / homme" },
  { href: "/admin/films-proches", libelle: "Films proches" },
  { href: "/admin/selectionnes-sans-image", libelle: "Sélectionnés sans image" },
  { href: "/admin/projets-sans-image", libelle: "Projets sans image" },
  { href: "/admin/portraits", libelle: "Portraits" },
  { href: "/admin/logos", libelle: "Logos" },
  { href: "/admin/photos", libelle: "Photos" },
  { href: "/admin/ateliers", libelle: "Ateliers" },
  { href: "/admin/tchat", libelle: "Tchat" },
  { href: "/admin/recherches", libelle: "Recherches" },
];

/**
 * La barre des pages d'administration, en tête de chacune : la page en
 * cours est soulignée, pour savoir où l'on est. Les codes lecteurs, qui
 * ne servent que deux ou trois fois par an, sont derrière la clé.
 */
export default function NavAdmin() {
  const chemin = usePathname() ?? "";
  // La relecture d'une fiche (/admin/fiches/…) se fait depuis « Fiches à valider ».
  const actif = (href: string) =>
    href === "/admin/fiches"
      ? chemin === href
      : chemin.startsWith(href) ||
        (href === "/admin/fiches-a-valider" && chemin.startsWith("/admin/fiches/"));

  return (
    <nav className={styles.navAdmin} aria-label="Administration">
      {PAGES.map((p, i) => (
        <Fragment key={p.href}>
          <Link
            href={p.href}
            className={`${actif(p.href) ? styles.navActif : styles.navLien} ${
              i < NB_PRINCIPALES ? styles.navPrincipal : ""
            }`}
            aria-current={actif(p.href) ? "page" : undefined}
          >
            {p.libelle}
          </Link>
          {i === NB_PRINCIPALES - 1 && <span className={styles.navSaut} aria-hidden="true" />}
        </Fragment>
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
