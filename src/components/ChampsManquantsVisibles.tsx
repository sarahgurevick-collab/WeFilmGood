"use client";

import { useEffect } from "react";

/**
 * Un champ obligatoire oublié bloquait l'enregistrement sans qu'on s'en
 * aperçoive : la bulle du navigateur (« Veuillez compléter ce champ ») est
 * minuscule et disparaît aussitôt (01/11/2026, Sarah, tagline de la fiche
 * projet). Sur tout le site, un champ refusé est maintenant encadré de
 * rouge, le message du navigateur reste écrit dessous, et la page défile
 * jusqu'au premier. Tout s'efface dès qu'on corrige le champ.
 */
export default function ChampsManquantsVisibles() {
  useEffect(() => {
    let dernierDefilement = 0;

    const surInvalide = (e: Event) => {
      const champ = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (!champ?.setAttribute || !champ.validationMessage) return;
      champ.setAttribute("data-champ-manquant", "");
      const id = champ.getAttribute("data-message-id") ?? `champ-manquant-${Math.random().toString(36).slice(2)}`;
      let message = document.getElementById(id);
      if (!message) {
        message = document.createElement("p");
        message.id = id;
        message.className = "champ-manquant-message";
        message.setAttribute("role", "alert");
        champ.setAttribute("data-message-id", id);
        champ.insertAdjacentElement("afterend", message);
      }
      message.textContent = champ.validationMessage;
      // Le premier champ refusé d'un même envoi : on le montre au centre.
      const maintenant = Date.now();
      if (maintenant - dernierDefilement > 500) {
        dernierDefilement = maintenant;
        champ.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };

    const surSaisie = (e: Event) => {
      const champ = e.target as HTMLInputElement;
      if (!champ?.hasAttribute?.("data-champ-manquant")) return;
      if (champ.checkValidity()) {
        champ.removeAttribute("data-champ-manquant");
        const id = champ.getAttribute("data-message-id");
        if (id) document.getElementById(id)?.remove();
        champ.removeAttribute("data-message-id");
      }
    };

    document.addEventListener("invalid", surInvalide, true);
    document.addEventListener("input", surSaisie, true);
    document.addEventListener("change", surSaisie, true);
    return () => {
      document.removeEventListener("invalid", surInvalide, true);
      document.removeEventListener("input", surSaisie, true);
      document.removeEventListener("change", surSaisie, true);
    };
  }, []);

  return null;
}
