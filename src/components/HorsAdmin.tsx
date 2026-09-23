"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** N'affiche son contenu que hors des pages d'administration. */
export default function HorsAdmin({ children }: { children: ReactNode }) {
  const chemin = usePathname();
  if (chemin?.startsWith("/admin")) return null;
  return children;
}
