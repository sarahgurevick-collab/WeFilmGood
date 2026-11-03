/** Ce que contient un cadre de personnage à cet instant, pour savoir s'il a bougé depuis. */
export function contenu(form: HTMLFormElement): string {
  return JSON.stringify(
    Array.from(new FormData(form)).map(([nom, v]) =>
      v instanceof File ? [nom, v.name, v.size, v.lastModified] : [nom, v],
    ),
  );
}
