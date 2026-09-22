"use client";

import { useEffect } from "react";

/** Enregistre le service worker (public/sw.js) : c'est ce qui rend le site installable. */
export default function EnregistrerServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {
        // Sans service worker, le site marche comme avant, simplement
        // sans installation ni page hors ligne.
      });
  }, []);
  return null;
}
