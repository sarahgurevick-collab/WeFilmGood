"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { rechercherProjets, type ProjetTrouve } from "@/app/projets/actions";
import styles from "./Finder.module.css";
import projetsStyles from "@/app/projets/projets.module.css";

export default function Finder() {
  const [requete, setRequete] = useState("");
  const [resultats, setResultats] = useState<ProjetTrouve[] | null>(null);
  const [total, setTotal] = useState(0);
  const [enCours, setEnCours] = useState(false);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (minuteur.current) clearTimeout(minuteur.current);

    const q = requete.trim();
    if (!q) {
      setResultats(null);
      setEnCours(false);
      return;
    }

    setEnCours(true);
    minuteur.current = setTimeout(async () => {
      const { projets, total } = await rechercherProjets(q);
      setResultats(projets);
      setTotal(total);
      setEnCours(false);
    }, 300);

    return () => {
      if (minuteur.current) clearTimeout(minuteur.current);
    };
  }, [requete]);

  return (
    <div className={styles.zone}>
      <input
        type="search"
        className={styles.champ}
        placeholder="Chercher un projet, un thème, un mot-clé…"
        value={requete}
        onChange={(e) => setRequete(e.target.value)}
      />

      {requete.trim() && (
        <div className={styles.resultats}>
          {enCours ? (
            <p className={styles.indice}>Recherche…</p>
          ) : resultats && resultats.length > 0 ? (
            <>
              <p className={styles.indice}>
                {total} résultat{total > 1 ? "s" : ""} pour «&nbsp;{requete}&nbsp;»
                {total > resultats.length &&
                  ` — les ${resultats.length} plus récents affichés`}
              </p>
              <ul className={projetsStyles.grille}>
                {resultats.map((p) => (
                  <li key={p.id}>
                    <Link href={`/projets/${p.id}`} className={projetsStyles.carte}>
                      <div className={projetsStyles.vignette}>
                        {p.vignette ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.vignette} alt="" loading="lazy" />
                        ) : (
                          <span className={projetsStyles.sansImage}>Sans vignette</span>
                        )}
                        {p.status === "labellise" && (
                          <span className={projetsStyles.label}>Labellisé</span>
                        )}
                      </div>
                      <div className={projetsStyles.legende}>
                        <strong>{p.title}</strong>
                        {p.genre?.label_fr && (
                          <span className={projetsStyles.genre}>{p.genre.label_fr}</span>
                        )}
                        {p.logline && <p className={projetsStyles.logline}>{p.logline}</p>}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className={styles.indice}>Aucun résultat pour «&nbsp;{requete}&nbsp;».</p>
          )}
        </div>
      )}
    </div>
  );
}
