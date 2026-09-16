"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import styles from "./HashSession.module.css";

/**
 * Les emails Supabase par défaut renvoient la session dans le fragment de
 * l'URL (`#access_token=…`), que le serveur ne voit jamais. Ce composant le
 * récupère côté navigateur et l'échange contre des cookies de session,
 * puis redirige. Il rend les emails intégrés utilisables sans SMTP dédié,
 * et affiche les erreurs qui resteraient sinon invisibles.
 */
export default function HashSession() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Lu avant toute création de client : celui-ci consomme le fragment.
    const hash = window.location.hash;
    if (hash.length < 2) return;

    const params = new URLSearchParams(hash.slice(1));
    const clearHash = () =>
      window.history.replaceState(null, "", window.location.pathname + window.location.search);

    const description = params.get("error_description");
    if (description) {
      queueMicrotask(() => setError(description.replace(/\+/g, " ")));
      clearHash();
      return;
    }

    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken || !refreshToken) return;

    const type = params.get("type");
    createClient()
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error: sessionError }) => {
        clearHash();
        if (sessionError) {
          setError(sessionError.message);
          return;
        }
        router.replace(type === "recovery" ? "/nouveau-mot-de-passe" : "/menu");
        router.refresh();
      });
  }, [router]);

  if (!error) return null;

  return (
    <div className={styles.banner} role="alert">
      {error}
      <a href="/lost-pwd">Demander un nouveau lien</a>
    </div>
  );
}
