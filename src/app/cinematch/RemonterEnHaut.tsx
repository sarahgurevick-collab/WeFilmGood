"use client";

import { useEffect } from "react";

/**
 * Après « Enregistrer » (21/10/2026, Sarah) : le bouton est tout en bas, la
 * page se recharge et le navigateur garde la position — l'encadré et le
 * match, en haut, passaient inaperçus. On remonte en haut à l'arrivée.
 * L'ancre #etat seule ne suffit pas : la navigation après une action
 * serveur ne la suit pas toujours.
 */
export default function RemonterEnHaut() {
  useEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  return null;
}
