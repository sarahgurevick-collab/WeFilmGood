"use client";

import { useEffect, useState } from "react";
import Assistant from "./Assistant";
import BoutonContact from "./BoutonContact";

type Etat =
  | { actif: false; connecte?: boolean; nom?: string | null; email?: string | null }
  | { actif: true; nom: string | null; prenom: string | null; email: string; ia: boolean };

/**
 * Le rond en bas à droite : le tchat « On papote ? » pour un membre
 * connecté, le formulaire de contact pour les visiteurs et les lecteurs. La question est
 * posée au serveur après l'affichage, pour que les pages restent statiques.
 */
export default function ContactOuAssistant() {
  const [etat, setEtat] = useState<Etat>({ actif: false });

  useEffect(() => {
    fetch("/api/assistant", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: Etat) => setEtat(d))
      .catch(() => {});
  }, []);

  return etat.actif ? <Assistant nom={etat.nom} prenom={etat.prenom} email={etat.email} ia={etat.ia} /> : (
    <BoutonContact connecte={etat.connecte ?? false} nom={etat.nom ?? ""} email={etat.email ?? ""} />
  );
}
