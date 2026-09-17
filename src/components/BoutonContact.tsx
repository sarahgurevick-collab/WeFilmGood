"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./BoutonContact.module.css";

type Etat = "ferme" | "ouvert" | "envoi" | "envoye" | "erreur";

export default function BoutonContact() {
  const [etat, setEtat] = useState<Etat>("ferme");

  const envoyer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    // Piège à robots : un champ invisible que seul un bot remplit.
    if (data.get("site_web")) {
      setEtat("envoye");
      return;
    }

    setEtat("envoi");
    const supabase = createClient();
    const { error } = await supabase.rpc("envoyer_message_contact", {
      p_nom: data.get("nom"),
      p_email: data.get("email"),
      p_message: data.get("message"),
    });

    if (error) {
      setEtat("erreur");
      return;
    }

    form.reset();
    setEtat("envoye");
  };

  return (
    <>
      <button
        type="button"
        className={styles.bouton}
        onClick={() => setEtat(etat === "ferme" ? "ouvert" : "ferme")}
        aria-label="Nous écrire"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m2 6 10 7 10-7" />
        </svg>
      </button>

      {etat !== "ferme" && (
        <div className={styles.panneau}>
          <button
            type="button"
            className={styles.fermer}
            onClick={() => setEtat("ferme")}
            aria-label="Fermer"
          >
            ×
          </button>

          {etat === "envoye" ? (
            <p className={styles.confirmation}>
              Message envoyé, merci ! On vous répond par email.
            </p>
          ) : (
            <form onSubmit={envoyer} className={styles.formulaire}>
              <h3 className={styles.titre}>Nous écrire</h3>
              <p className={styles.soustitre}>
                Pas besoin de créer un profil pour nous contacter.
              </p>

              <input
                type="text"
                name="site_web"
                className={styles.honeypot}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
              />

              <input type="text" name="nom" placeholder="Votre nom (facultatif)" />
              <input type="email" name="email" placeholder="Votre email" required />
              <textarea name="message" placeholder="Votre message" rows={4} required />

              {etat === "erreur" && (
                <p className={styles.erreur}>
                  L&apos;envoi a échoué, réessayez dans un instant.
                </p>
              )}

              <button type="submit" disabled={etat === "envoi"}>
                {etat === "envoi" ? "Envoi…" : "Envoyer"}
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
