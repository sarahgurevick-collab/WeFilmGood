/**
 * L'envoi d'une vidéo par morceaux vers /api/videopitch (côté navigateur).
 * Une connexion qui saute reprend au morceau suivant : le serveur dit où
 * il en est. Écrit pour le ComedyPitch (13/11) d'après EnvoiVideopitch.
 */
export async function envoyerVideoParMorceaux(
  fichier: File,
  ouverture: Record<string, unknown>,
  surProgres: (part: number) => void,
): Promise<void> {
  const debut = await fetch("/api/videopitch/depots", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...ouverture, nom: fichier.name, taille: fichier.size, type: fichier.type }),
  });
  const infos = (await debut.json().catch(() => ({}))) as { id?: string; morceau?: number; erreur?: string };
  if (!debut.ok || !infos.id) throw new Error(infos.erreur ?? "Le dépôt n'a pas pu commencer.");
  const taille = infos.morceau ?? 8 * 1024 * 1024;

  let decalage = 0;
  let essais = 0;
  while (decalage < fichier.size) {
    const tranche = fichier.slice(decalage, Math.min(decalage + taille, fichier.size));
    try {
      const reponse = await fetch(`/api/videopitch/depots/${infos.id}/morceau`, {
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream", "x-decalage": String(decalage) },
        body: tranche,
      });
      const corps = (await reponse.json().catch(() => ({}))) as { recu?: number; erreur?: string };
      if (reponse.status === 409 && typeof corps.recu === "number") {
        decalage = corps.recu;
        continue;
      }
      if (!reponse.ok || typeof corps.recu !== "number") throw new Error(corps.erreur ?? "Envoi interrompu.");
      decalage = corps.recu;
      essais = 0;
    } catch (e) {
      if (++essais > 6) throw e instanceof Error ? e : new Error("Envoi interrompu.");
      await new Promise((r) => setTimeout(r, 1500 * essais));
      continue;
    }
    surProgres(decalage / fichier.size);
  }

  const fin = await fetch(`/api/videopitch/depots/${infos.id}/terminer`, { method: "POST" });
  const resultat = (await fin.json().catch(() => ({}))) as { erreur?: string };
  if (!fin.ok) throw new Error(resultat.erreur ?? "La fin de l'envoi a échoué.");
}
