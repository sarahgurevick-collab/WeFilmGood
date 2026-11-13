import type { Instrumentation } from "next";

/**
 * Le journal des erreurs du serveur (13/11/2026) : chaque erreur attrapée par
 * Next (page, action d'un bouton, route) est notée dans un fichier hors du
 * dépôt, ~/journal-erreurs-site.log. Sans lui, une action qui échoue ne dit
 * rien à l'écran et le journal du service n'est pas lisible sans sudo.
 * Rien de personnel n'y est écrit : ni cookies, ni en-têtes, ni contenu envoyé.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { appendFile } = await import("node:fs/promises");
    const { homedir } = await import("node:os");
    const { join } = await import("node:path");
    const erreur = err as { message?: string; digest?: string; stack?: string } | null;
    const ligne = JSON.stringify({
      quand: new Date().toISOString(),
      methode: request.method,
      adresse: request.path,
      route: context.routePath,
      type: context.routeType,
      digest: erreur?.digest,
      message: erreur?.message ?? String(err),
      pile: erreur?.stack?.split("\n").slice(0, 8).join("\n"),
    });
    await appendFile(join(homedir(), "journal-erreurs-site.log"), `${ligne}\n`);
  } catch {
    // Le journal ne doit jamais faire tomber une page.
  }
};
