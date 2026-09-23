"use client";

import { useEffect, useState, useTransition } from "react";
import {
  changerStatut,
  mesQuestions,
  poserQuestion,
  questionsRegie,
  type Question,
} from "@/app/ateliers/[salle]/actions";
import styles from "./QuestionsAtelier.module.css";

const RAFRAICHISSEMENT_MS = 5000;

const ETIQUETTE: Record<Question["statut"], string> = {
  nouvelle: "En attente",
  relayee: "Posée aux intervenants",
  ecartee: "Non retenue",
};

function heure(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/** Le panneau du public : écrire une question et voir ce qu'elle devient. */
export function QuestionsPublic({ salle }: { salle: string }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [texte, setTexte] = useState("");
  const [erreur, setErreur] = useState(false);
  const [envoi, demarrer] = useTransition();

  useEffect(() => {
    let actif = true;
    const charger = () => mesQuestions(salle).then((q) => actif && setQuestions(q));
    charger();
    const minuteur = setInterval(charger, RAFRAICHISSEMENT_MS);
    return () => {
      actif = false;
      clearInterval(minuteur);
    };
  }, [salle]);

  return (
    <aside className={styles.panneau}>
      <h2 className={styles.titre}>Vos questions</h2>
      <p className={styles.aide}>
        Écrivez votre question : l&apos;équipe de WeFilmGood la relaiera aux intervenants.
      </p>
      <form
        className={styles.formulaire}
        onSubmit={(e) => {
          e.preventDefault();
          if (!texte.trim()) return;
          demarrer(async () => {
            const r = await poserQuestion(salle, texte);
            setErreur(!r.ok);
            if (r.ok) setTexte("");
            setQuestions(r.questions);
          });
        }}
      >
        <textarea
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="Votre question…"
          className={styles.zone}
        />
        <button type="submit" className={styles.envoyer} disabled={envoi || !texte.trim()}>
          {envoi ? "Envoi…" : "Envoyer"}
        </button>
        {erreur && <p className={styles.erreur}>La question n&apos;est pas partie. Réessayez.</p>}
      </form>
      <ul className={styles.liste}>
        {[...questions].reverse().map((q) => (
          <li key={q.id} className={styles.question}>
            <p>{q.texte}</p>
            <span className={styles[q.statut]}>
              {heure(q.created_at)} · {ETIQUETTE[q.statut]}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

/** Le panneau de la régie : toutes les questions, à relayer ou écarter. */
export function QuestionsRegie({ salle }: { salle: string }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [voirTraitees, setVoirTraitees] = useState(false);

  useEffect(() => {
    let actif = true;
    const charger = () => questionsRegie(salle).then((q) => actif && setQuestions(q));
    charger();
    const minuteur = setInterval(charger, RAFRAICHISSEMENT_MS);
    return () => {
      actif = false;
      clearInterval(minuteur);
    };
  }, [salle]);

  const marquer = async (id: string, statut: Question["statut"]) => {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, statut } : q)));
    setQuestions(await changerStatut(salle, id, statut));
  };

  const enAttente = questions.filter((q) => q.statut === "nouvelle");
  const traitees = questions.filter((q) => q.statut !== "nouvelle");

  return (
    <aside className={styles.panneau}>
      <h2 className={styles.titre}>
        Questions du public <span className={styles.compteur}>{enAttente.length}</span>
      </h2>
      {enAttente.length === 0 && <p className={styles.aide}>Aucune question en attente.</p>}
      <ul className={styles.liste}>
        {enAttente.map((q) => (
          <li key={q.id} className={styles.question}>
            <strong className={styles.auteur}>{q.auteur}</strong>
            <p>{q.texte}</p>
            <span className={styles.nouvelle}>{heure(q.created_at)}</span>
            <div className={styles.actions}>
              <button type="button" className={styles.envoyer} onClick={() => marquer(q.id, "relayee")}>
                Relayée
              </button>
              <button type="button" className={styles.lien} onClick={() => marquer(q.id, "ecartee")}>
                Écarter
              </button>
            </div>
          </li>
        ))}
      </ul>
      {traitees.length > 0 && (
        <>
          <button type="button" className={styles.lien} onClick={() => setVoirTraitees((v) => !v)}>
            {voirTraitees ? "Masquer" : "Voir"} les questions traitées ({traitees.length})
          </button>
          {voirTraitees && (
            <ul className={styles.liste}>
              {traitees.map((q) => (
                <li key={q.id} className={`${styles.question} ${styles.traitee}`}>
                  <strong className={styles.auteur}>{q.auteur}</strong>
                  <p>{q.texte}</p>
                  <span className={styles[q.statut]}>
                    {heure(q.created_at)} · {ETIQUETTE[q.statut]}
                  </span>
                  <div className={styles.actions}>
                    <button type="button" className={styles.lien} onClick={() => marquer(q.id, "nouvelle")}>
                      Remettre en attente
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </aside>
  );
}
