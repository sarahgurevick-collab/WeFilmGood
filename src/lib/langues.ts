/**
 * Les langues sont rangées en codes (« fr », « en »…). À l'écran, on écrit
 * le nom en toutes lettres : « fr » se lisait « France » autant que
 * « Français ».
 */
const noms = new Intl.DisplayNames(["fr"], { type: "language" });

export function nomDeLangue(code: string | null | undefined): string | null {
  if (!code) return null;
  try {
    const nom = noms.of(code);
    return nom ? nom.charAt(0).toUpperCase() + nom.slice(1) : code;
  } catch {
    return code;
  }
}
