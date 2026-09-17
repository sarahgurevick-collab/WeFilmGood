"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, type CSSProperties, type ReactNode } from "react";

const DELAI_MS = 350;

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

  const survol = () => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    minuteur.current = setTimeout(() => router.push(href), DELAI_MS);
  };

  const annuler = () => {
    if (minuteur.current) clearTimeout(minuteur.current);
  };

  return (
    <Link
      href={href}
      className={className}
      style={style}
      onMouseEnter={survol}
      onMouseLeave={annuler}
    >
      {children}
    </Link>
  );
}
