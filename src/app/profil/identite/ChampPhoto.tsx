"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import CadreGlissant from "@/app/admin/portraits/CadreGlissant";
import formStyles from "@/components/form.module.css";
import { cadrerPhoto, retirerPhoto, savePhoto } from "../actions";
import styles from "../profil.module.css";

/**
 * La photo du profil, ronde comme le logo. Choisir une image l'envoie
 * aussitôt : pas de second bouton « Enregistrer » à trouver. L'aperçu
 * s'affiche pendant l'envoi.
 *
 * Depuis le 02/11/2026 (demande de Sarah, photo de Sadaf Foroughi coupée
 * au-dessus des yeux), la photo entière est gardée et le membre fait
 * glisser le cadre rond pour choisir ce qui s'affiche, comme pour les
 * portraits des personnages. Les photos envoyées avant n'ont que leur
 * carré : il faut les renvoyer pour les recadrer.
 */
export default function ChampPhoto({
  photo,
  original,
  x = 50,
  y = 20,
  initiale,
  retour,
}: {
  photo: string | null;
  /** La photo entière, à faire glisser ; nulle pour une photo d'avant le 02/11/2026. */
  original?: string | null;
  x?: number;
  y?: number;
  initiale: string;
  /** La page où revenir après l'envoi (le profil du lecteur) ; par défaut l'identité. */
  retour?: "/lecteur/profil";
}) {
  const [apercu, setApercu] = useState<string | null>(null);
  const formulaire = useRef<HTMLFormElement>(null);
  const image = photo ?? apercu;

  return (
    <div className={styles.champPhoto}>
      {photo && original ? (
        <form action={cadrerPhoto} className={styles.cadrePhoto}>
          {retour && <input type="hidden" name="retour" value={retour} />}
          <CadreGlissant
            src={original}
            x={x}
            y={y}
            sauve={`${x},${y}`}
            enfants={<BoutonCadrage />}
          />
        </form>
      ) : (
        <div className={styles.affichePhoto} aria-hidden="true">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" />
          ) : (
            <span>{initiale}</span>
          )}
        </div>
      )}

      <div className={styles.champPhotoActions}>
        {!photo && (
          <form ref={formulaire} action={savePhoto}>
            {retour && <input type="hidden" name="retour" value={retour} />}
            <label className={`${formStyles.submit} ${styles.boutonPhoto}`}>
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
              <Libelle />
            </label>
          </form>
        )}
        {photo && (
          <form action={retirerPhoto} onSubmit={() => setApercu(null)}>
            {retour && <input type="hidden" name="retour" value={retour} />}
            <button type="submit" className={styles.lienPhoto}>
              Retirer la photo
            </button>
          </form>
        )}
        <p className={styles.champPhotoAide}>
          {photo && original
            ? "Glissez la photo dans le rond pour choisir ce qui s'affiche, puis enregistrez le cadrage."
            : photo
              ? "Pour déplacer le cadre, retirez la photo et renvoyez-la."
              : "Une photo de vous, bien éclairée. Elle sera recadrée en rond."}
        </p>
      </div>
    </div>
  );
}

function Libelle() {
  const { pending } = useFormStatus();
  if (pending) return <span>Envoi de la photo…</span>;
  return <span>Ajouter une photo</span>;
}

function BoutonCadrage() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={formStyles.submit} disabled={pending}>
      {pending ? "Enregistrement…" : "Enregistrer le cadrage"}
    </button>
  );
}
