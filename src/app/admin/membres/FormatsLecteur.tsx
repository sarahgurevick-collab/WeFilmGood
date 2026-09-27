"use client";

import { choisirFormatsLecteur } from "./actions";
import styles from "./page.module.css";

const FORMATS: [string, string][] = [
  ["long_metrage", "LM"],
  ["court_metrage", "CM"],
  ["serie", "Séries"],
  ["immersif_360_vr", "VR"],
];

/**
 * Les formats qu'un lecteur peut lire, cochés par défaut. Décocher tout :
 * il reste lecteur mais ne reçoit plus de projet. Enregistré au clic.
 */
export default function FormatsLecteur({
  profileId,
  formats,
}: {
  profileId: string;
  formats: string[] | null;
}) {
  return (
    <form action={choisirFormatsLecteur} className={styles.formatsLecteur}>
      <input type="hidden" name="profile_id" value={profileId} />
      {FORMATS.map(([valeur, libelle]) => (
        <label key={valeur} title="Formats que ce lecteur peut lire">
          <input
            type="checkbox"
            name="format"
            value={valeur}
            defaultChecked={!formats || formats.includes(valeur)}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
          />
          {libelle}
        </label>
      ))}
    </form>
  );
}
