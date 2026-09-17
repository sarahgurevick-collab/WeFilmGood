"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, type CSSProperties, type ReactNode } from "react";

const DELAI_MS = 900;

/**
 * Sur souris/trackpad, le survol suffit à "entrer" dans la fiche après un
 * court délai (le temps du zoom CSS sur la tuile) ; au doigt, il n'y a
 * pas de survol donc le clic/tap classique du lien reste le seul chemin.
 */
export default function TuileEntree({
  href,
  className,
  style,
  children,
}: {
  href: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const router = useRouter();
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enCours = useRef(false);

  // onMouseMove plutôt que onMouseEnter : les vignettes se déplacent (CSS)
  // sous un curseur resté immobile, ce qui déclenche un faux survol sans
  // que la personne n'ait rien fait — un vrai mousemove exige un geste réel.
  const survol = () => {
    if (enCours.current) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    enCours.current = true;
    minuteur.current = setTimeout(() => router.push(href), DELAI_MS);
  };

  const annuler = () => {
    enCours.current = false;
    if (minuteur.current) clearTimeout(minuteur.current);
  };

  return (
    <Link
      href={href}
      className={className}
      style={style}
      onMouseMove={survol}
      onMouseLeave={annuler}
    >
      {children}
    </Link>
  );
}
