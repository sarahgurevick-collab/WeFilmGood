"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { retirerPhoto, savePhoto } from "../actions";
import styles from "../profil.module.css";

/**
 * La photo du profil, ronde comme le logo. Choisir une image l'envoie
 * aussitôt : pas de second bouton « Enregistrer » à trouver. L'aperçu
 * s'affiche pendant l'envoi.
 */
export default function ChampPhoto({ photo, initiale }: { photo: string | null; initiale: string }) {
  const [apercu, setApercu] = useState<string | null>(null);
  const formulaire = useRef<HTMLFormElement>(null);
  const image = apercu ?? photo;

  return (
    <div className={styles.champPhoto}>
      <div className={styles.affichePhoto} aria-hidden="true">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" />
        ) : (
          <span>{initiale}</span>
        )}
      </div>

      <div className={styles.champPhotoActions}>
        <form ref={formulaire} action={savePhoto}>
          <label className={styles.boutonPhoto}>
            <input
              type="file"
              name="photo"
              // Sans HEIC dans la liste, l'iPhone convertit la photo en JPEG avant
              // l'envoi : le serveur ne sait pas lire le HEIC.
              accept="image/jpeg,image/png,image/webp"
              className={styles.fichierCache}
              onChange={(e) => {
                const fichier = e.currentTarget.files?.[0];
                if (!fichier) return;
                setApercu(URL.createObjectURL(fichier));
                formulaire.current?.requestSubmit();
              }}
            />
            <Libelle aPhoto={!!photo} />
          </label>
        </form>
        {photo && !apercu && (
          <form action={retirerPhoto}>
            <button type="submit" className={styles.lienPhoto}>
              Retirer la photo
            </button>
          </form>
        )}
        <p className={styles.champPhotoAide}>
          Une photo de vous, bien éclairée. Elle sera recadrée en rond.
        </p>
      </div>
    </div>
  );
}

function Libelle({ aPhoto }: { aPhoto: boolean }) {
  const { pending } = useFormStatus();
  if (pending) return <span>Envoi de la photo…</span>;
  return <span>{aPhoto ? "Changer la photo" : "Ajouter une photo"}</span>;
}
