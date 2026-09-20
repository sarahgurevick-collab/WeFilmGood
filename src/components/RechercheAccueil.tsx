"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { compterRecherche, type DecompteRecherche } from "@/app/projets/actions";
import styles from "./RechercheAccueil.module.css";

/**
 * La recherche de la page d'accueil, ouverte à tous — mais qui ne montre
 * que des NOMBRES. Aucune fiche, aucun titre, aucune logline : les
 * auteurs protègent leur travail, et certaines photos portent des droits
 * à l'image. Consulter suppose un compte professionnel.
 *
 * Le décompte vient d'une fonction de la base qui ne renvoie que des
 * totaux : le contenu ne transite jamais jusqu'au navigateur.
 */
export default function RechercheAccueil() {
  const [requete, setRequete] = useState("");
  const [decompte, setDecompte] = useState<DecompteRecherche | null>(null);
  const [enCours, setEnCours] = useState(false);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (minuteur.current) clearTimeout(minuteur.current);
    if (!requete.trim()) {
      setDecompte(null);
      setEnCours(false);
      return;
    }
    setEnCours(true);
    minuteur.current = setTimeout(async () => {
      setDecompte(await compterRecherche(requete));
      setEnCours(false);
    }, 350);
    return () => {
      if (minuteur.current) clearTimeout(minuteur.current);
    };
  }, [requete]);

  const total = decompte
    ? decompte.projets + decompte.talents + decompte.personnages
    : 0;

  return (
    <div className={styles.zone}>
      <input
        type="search"
        className={styles.champ}
        placeholder="Trouvez des projets, des talents, des personnages"
        value={requete}
        onChange={(e) => setRequete(e.target.value)}
        aria-label="Chercher dans la plateforme"
      />

      {requete.trim() && (
        <div className={styles.reponse} aria-live="polite">
          {enCours && !decompte ? (
            <p className={styles.attente}>Recherche…</p>
          ) : total === 0 ? (
            <p className={styles.attente}>
              Aucun résultat pour «&nbsp;{requete}&nbsp;».
            </p>
          ) : (
            <>
              <ul className={styles.compteurs}>
                <li>
                  <strong>{decompte?.projets}</strong>
                  <span>projet{(decompte?.projets ?? 0) > 1 ? "s" : ""}</span>
                </li>
                <li>
                  <strong>{decompte?.talents}</strong>
                  <span>talent{(decompte?.talents ?? 0) > 1 ? "s" : ""}</span>
                </li>
                <li>
                  <strong>{decompte?.personnages}</strong>
                  <span>
                    personnage{(decompte?.personnages ?? 0) > 1 ? "s" : ""}
                  </span>
                </li>
              </ul>
              <p className={styles.appel}>
                Pour les consulter,{" "}
                <Link href="/inscription" className={styles.lien}>
                  créez votre profil professionnel
                </Link>
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
