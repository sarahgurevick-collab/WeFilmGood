"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { envoyerMessageContact } from "@/app/actions";
import { EVENEMENT_CONTACT } from "./BoutonDevis";
import contact from "./BoutonContact.module.css";
import styles from "./Assistant.module.css";

type Message = { role: "user" | "assistant"; content: string };

const ACCUEIL_IA =
  "Je réponds à vos questions sur WeFilmGood : profil, fiche projet, lectures, adhésion, application… Si je ne sais pas, je transmets votre demande à l'équipe.";

const ERREURS: Record<number, string> = {
  429: "Vous avez atteint le nombre de questions du jour. Utilisez « Transmettre à l'équipe » : on vous répondra par email.",
  503: "L'assistant n'est pas disponible pour le moment. Utilisez « Transmettre à l'équipe ».",
};

/**
 * L'assistant des membres connectés, à la place du bouton de contact :
 * il répond sur le fonctionnement du site (MiniMax M3, via /api/assistant)
 * et, s'il ne sait pas, transmet la conversation à l'équipe, qui répond
 * par email. Les visiteurs et les lecteurs gardent le formulaire classique.
 */
export default function Assistant({
  nom,
  prenom,
  email: emailConnu,
  ia,
  visiteur = false,
}: {
  nom: string | null;
  prenom: string | null;
  email: string;
  /** false tant que la clé de l'IA manque : chaque message part à l'équipe. */
  ia: boolean;
  /** Pas connecté : on lui demande son email pour pouvoir lui répondre. */
  visiteur?: boolean;
}) {
  const [email, setEmail] = useState(emailConnu);
  // Avec l'IA, l'email d'un visiteur n'est demandé qu'au moment de
  // transmettre à l'équipe — c'est rare : le tchat répond à presque tout.
  const [demandeEmail, setDemandeEmail] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [saisie, setSaisie] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [transmission, setTransmission] = useState<"non" | "envoi" | "fait" | "erreur">("non");
  const fil = useRef<HTMLDivElement>(null);

  // « Demander un devis » ouvre l'assistant avec la demande déjà commencée.
  useEffect(() => {
    const ouvrir = (e: Event) => {
      setSaisie((e as CustomEvent<{ message?: string }>).detail?.message ?? "");
      setOuvert(true);
    };
    window.addEventListener(EVENEMENT_CONTACT, ouvrir);
    return () => window.removeEventListener(EVENEMENT_CONTACT, ouvrir);
  }, []);

  useEffect(() => {
    fil.current?.scrollTo({ top: fil.current.scrollHeight });
  }, [messages, ouvert]);

  const envoyer = async (e: FormEvent) => {
    e.preventDefault();
    const question = saisie.trim();
    if (!question || enCours) return;

    // Sans IA, le tchat sert de messagerie vers l'équipe, qui répond par email.
    if (!ia) {
      setMessages((m) => [...m, { role: "user", content: question }]);
      setSaisie("");
      setEnCours(true);
      const donnees = new FormData();
      donnees.set("nom", nom ?? "");
      donnees.set("email", email);
      donnees.set("message", question);
      const { ok } = await envoyerMessageContact(donnees);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: ok
            ? "Message envoyé, merci ! On vous répond par email."
            : "L'envoi a échoué, réessayez dans un instant.",
        },
      ]);
      setEnCours(false);
      return;
    }

    const suite: Message[] = [...messages, { role: "user", content: question }];
    setMessages([...suite, { role: "assistant", content: "" }]);
    setSaisie("");
    setEnCours(true);
    setTransmission("non");

    const ecrire = (texte: string) =>
      setMessages((m) => [...m.slice(0, -1), { role: "assistant", content: texte }]);

    try {
      const reponse = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: suite }),
      });
      if (!reponse.ok || !reponse.body) {
        ecrire(ERREURS[reponse.status] ?? "Je n'ai pas pu répondre. Réessayez, ou utilisez « Transmettre à l'équipe ».");
        return;
      }
      const lecture = reponse.body.getReader();
      const decodeur = new TextDecoder();
      let texte = "";
      for (;;) {
        const { value, done } = await lecture.read();
        if (done) break;
        texte += decodeur.decode(value, { stream: true });
        ecrire(texte);
      }
      if (!texte.trim()) ecrire("Je n'ai pas de réponse à vous donner. Utilisez « Transmettre à l'équipe ».");
    } catch {
      ecrire("La connexion a été coupée. Réessayez, ou utilisez « Transmettre à l'équipe ».");
    } finally {
      setEnCours(false);
    }
  };

  // La conversation part à l'équipe par le même chemin que le formulaire
  // de contact : l'équipe répond par email.
  const transmettre = async () => {
    if (!email.trim()) {
      setDemandeEmail(true);
      return;
    }
    const echange = [...messages, ...(saisie.trim() ? [{ role: "user" as const, content: saisie.trim() }] : [])];
    if (echange.length === 0) return;
    setTransmission("envoi");
    const donnees = new FormData();
    donnees.set("nom", nom ?? "");
    donnees.set("email", email);
    donnees.set(
      "message",
      "Conversation avec l'assistant du site :\n\n" +
        echange.map((m) => `${m.role === "user" ? "Membre" : "Assistant"} : ${m.content}`).join("\n\n"),
    );
    const { ok } = await envoyerMessageContact(donnees);
    setTransmission(ok ? "fait" : "erreur");
  };

  return (
    <>
      <button
        type="button"
        className={contact.bouton}
        onClick={() => setOuvert((o) => !o)}
        aria-label="Poser une question"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
        </svg>
      </button>

      {ouvert && (
        <div className={`${contact.panneau} ${styles.panneau}`}>
          <button type="button" className={contact.fermer} onClick={() => setOuvert(false)} aria-label="Fermer">
            ⊖
          </button>
          <h3 className={contact.titre}>On papote ?</h3>
          {visiteur && (
            <p className={contact.soustitre}>Pas besoin de créer un profil pour nous écrire.</p>
          )}

          <div ref={fil} className={styles.fil} aria-live="polite">
            <p className={styles.assistant}>
              {prenom ? `Bonjour ${prenom} !` : "Bonjour !"}
              {ia && ` ${ACCUEIL_IA}`}
            </p>
            {messages.map((m, i) => (
              <p key={i} className={m.role === "user" ? styles.membre : styles.assistant}>
                {m.content || (enCours && i === messages.length - 1 ? "…" : "")}
              </p>
            ))}
          </div>

          <form onSubmit={envoyer} className={styles.saisie}>
            {/* L'équipe répond par email : un visiteur donne le sien — dès
                le premier message sans IA, sinon seulement pour « Transmettre ». */}
            {visiteur && (!ia || demandeEmail) && (
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Votre email"
                required={!ia || demandeEmail}
                autoFocus={demandeEmail}
                className={styles.email}
              />
            )}
            <textarea
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void envoyer(e);
                }
              }}
              placeholder={ia ? "Votre question…" : "Votre message…"}
              rows={2}
              maxLength={2000}
              autoFocus={!visiteur}
            />
            <button type="submit" disabled={enCours || !saisie.trim()}>
              {enCours ? "…" : "Envoyer"}
            </button>
          </form>

          {ia && (
            <div className={styles.equipe}>
              {transmission === "fait" ? (
                <span>Transmis à l&apos;équipe, merci ! On vous répond par email ({email}).</span>
              ) : (
                <button
                  type="button"
                  className={styles.transmettre}
                  onClick={transmettre}
                  disabled={transmission === "envoi" || (messages.length === 0 && !saisie.trim())}
                >
                  {transmission === "envoi" ? "Transmission…" : "Transmettre à l'équipe"}
                </button>
              )}
              {transmission === "erreur" && (
                <span className={contact.erreur}>L&apos;envoi a échoué, réessayez dans un instant.</span>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
