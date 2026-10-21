"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "@/app/profil/profil.module.css";

const MAX_VISIBLES = 8;

/**
 * Le champ « ou autre chose… » de CinéMatch, avec les réponses des autres
 * (21/10/2026, Sarah). La liste du navigateur (<datalist>) ne s'ouvrait
 * qu'au deuxième clic : on remplissait sans jamais la voir. Ici elle
 * s'ouvre dès qu'on entre dans le champ, les plus fréquentes en premier, et
 * se filtre en tapant ; un clic sur une ligne la recopie dans le champ.
 */
export default function ChampLibre({
  name,
  defaultValue,
  placeholder,
  suggestions,
  disabled = false,
}: {
  name: string;
  defaultValue: string;
  placeholder: string;
  suggestions: string[];
  disabled?: boolean;
}) {
  const [valeur, setValeur] = useState(defaultValue);
  const [ouverte, setOuverte] = useState(false);
  const champ = useRef<HTMLInputElement>(null);
  const idListe = useId();

  // Le brouillon d'un visiteur (BrouillonCineMatch) remet la valeur dans le
  // champ sans passer par React : on la relit à l'arrivée.
  useEffect(() => {
    if (champ.current && champ.current.value !== valeur) setValeur(champ.current.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtre = valeur.trim().toLowerCase();
  const visibles = (filtre
    ? suggestions.filter((s) => s.toLowerCase().includes(filtre))
    : suggestions
  ).slice(0, MAX_VISIBLES);

  const choisir = (texte: string) => {
    setValeur(texte);
    setOuverte(false);
    const input = champ.current;
    if (input) {
      // Le même chemin que la saisie : le brouillon et le compteur du bouton
      // écoutent « input » sur le formulaire.
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, texte);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };

  return (
    <div className={styles.champLibre}>
      <input
        ref={champ}
        type="text"
        name={name}
        value={valeur}
        onChange={(e) => {
          setValeur(e.target.value);
          setOuverte(true);
        }}
        onFocus={() => setOuverte(true)}
        onBlur={() => setTimeout(() => setOuverte(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOuverte(false);
        }}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
        aria-autocomplete="list"
        aria-controls={idListe}
        aria-expanded={ouverte && visibles.length > 0}
      />
      {ouverte && !disabled && visibles.length > 0 && (
        <ul id={idListe} role="listbox" className={styles.suggestions}>
          {visibles.map((s) => (
            <li key={s} role="option" aria-selected={s === valeur}>
              <button type="button" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => choisir(s)}>
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
