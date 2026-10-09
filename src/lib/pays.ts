/**
 * Liste des pays du monde, en français, pour les listes déroulantes.
 * Pas de valeur par défaut : c'est à la personne de choisir le sien.
 *
 * La base garde le code à deux lettres (FR, BE, CD…), comme les profils
 * repris de WFG 1 et comme l'écran des membres le lit. La liste ne stockait
 * que des noms jusqu'au 09/10/2026 : un profil repris affichait alors
 * « Afghanistan », le premier de la liste, faute de trouver « FR ».
 */

const nomsDePays = new Intl.DisplayNames(["fr"], { type: "region", fallback: "none" });

// Codes qui ne sont pas des pays.
const EXCLUS = new Set(["EU", "UN", "EZ", "AQ", "QO", "ZZ", "XA", "XB", "BV", "HM", "UM"]);

function tousLesPays(): { code: string; nom: string }[] {
  const liste: { code: string; nom: string }[] = [];
  for (let a = 65; a < 91; a++) {
    for (let b = 65; b < 91; b++) {
      const code = String.fromCharCode(a) + String.fromCharCode(b);
      if (EXCLUS.has(code)) continue;
      const nom = nomsDePays.of(code);
      if (nom && nom !== code) liste.push({ code, nom });
    }
  }
  return liste.sort((x, y) => x.nom.localeCompare(y.nom, "fr"));
}

export const PAYS: { code: string; nom: string }[] = tousLesPays();

/** Le nom français d'un code pays ; le code lui-même s'il est inconnu. */
export function nomDuPays(code: string | null | undefined): string | null {
  if (!code) return null;
  if (code.length !== 2) return code;
  try {
    return nomsDePays.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}
