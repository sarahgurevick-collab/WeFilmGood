"use client";

import { useEffect, useState } from "react";
import Assistant from "./Assistant";
import BoutonContact from "./BoutonContact";
import Traduction from "./Traduction";

type Etat =
  | { actif: false; connecte?: boolean; nom?: string | null; email?: string | null }
  | {
      actif: true;
      visiteur?: boolean;
      nom: string | null;
      prenom: string | null;
      email: string;
      ia: boolean;
    };

/**
 * Le rond en bas à droite : le tchat « On papote ? » pour les membres
 * connectés et les visiteurs de l'accueil, le formulaire de contact pour
 * les lecteurs. La question est
 * posée au serveur après l'affichage, pour que les pages restent statiques.
 *
 * Le globe de traduction passe par ici lui aussi : les lecteurs, qui n'ont
 * pas accès à la plateforme, n'en ont pas besoin (16/10).
 */
export default function ContactOuAssistant() {
  const [etat, setEtat] = useState<Etat | null>(null);

  useEffect(() => {
    fetch("/api/assistant", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: Etat) => setEtat(d))
      .catch(() => setEtat({ actif: false }));
  }, []);

  if (!etat) return null;

  // Connecté sans tchat : c'est un lecteur.
  const lecteur = !etat.actif && etat.connecte === true;

  return (
    <>
      {etat.actif ? (
        <Assistant
          nom={etat.nom}
          prenom={etat.prenom}
          email={etat.email}
          ia={etat.ia}
          visiteur={etat.visiteur ?? false}
        />
      ) : (
        <BoutonContact connecte={etat.connecte ?? false} nom={etat.nom ?? ""} email={etat.email ?? ""} />
      )}
      {!lecteur && <Traduction />}
    </>
  );
}
