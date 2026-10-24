import "server-only";

/**
 * Le filtre IA des commentaires CinéCrush (24/10/2026, Sarah : « oui, le
 * filtre IA au début ; si tout se passe bien avec la communauté créée,
 * on l'enlèvera »). Un petit modèle relit chaque commentaire à l'arrivée
 * et met de côté ce qui est insultant, hors sujet, ou qui contient un
 * numéro de téléphone ou une adresse. Le commentaire mis de côté attend
 * Sarah dans l'admin ; les autres paraissent tout de suite.
 *
 * Coût : une fraction de centime par commentaire. Sans clé OpenRouter,
 * ou si le modèle ne répond pas, le commentaire est publié : le filtre
 * ne doit jamais bloquer la conversation.
 */

const MODELE = "minimax/minimax-m3";

const CONSIGNE = `Tu relis un commentaire laissé par un membre de WeFilmGood, une plateforme de scénaristes et de producteurs, sous le videopitch d'un projet de film mis en avant cette semaine (le « CinéCrush »). Les commentaires sont des avis libres : enthousiastes, critiques, courts, maladroits, en français ou en anglais — tout cela est acceptable.
Mets de côté SEULEMENT : une insulte ou une attaque personnelle ; un propos haineux ou obscène ; une publicité ou un lien sans rapport ; un numéro de téléphone, une adresse postale ou une adresse email ; un texte sans aucun rapport avec le cinéma ou le projet.
Réponds UNIQUEMENT par un objet JSON : {"ok": true} si le commentaire peut paraître, ou {"ok": false, "motif": "<raison en quelques mots, en français>"} sinon.`;

export type VerdictFiltre = { ok: true } | { ok: false; motif: string };

export async function filtrerCommentaire(texte: string): Promise<VerdictFiltre> {
  const cle = process.env.OPENROUTER_API_KEY;
  if (!cle) return { ok: true };
  try {
    const reponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cle}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://app.wefilmgood.com",
        "X-Title": "WeFilmGood",
      },
      body: JSON.stringify({
        model: MODELE,
        temperature: 0,
        max_tokens: 120,
        messages: [
          { role: "system", content: CONSIGNE },
          { role: "user", content: texte.slice(0, 2000) },
        ],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!reponse.ok) {
      console.error("filtre CinéCrush", reponse.status);
      return { ok: true };
    }
    const corps = (await reponse.json()) as { choices?: { message?: { content?: string } }[] };
    const brut = corps.choices?.[0]?.message?.content ?? "";
    const json = brut.match(/\{[\s\S]*\}/)?.[0];
    if (!json) return { ok: true };
    const verdict = JSON.parse(json) as { ok?: boolean; motif?: string };
    if (verdict.ok === false) return { ok: false, motif: (verdict.motif ?? "à relire").slice(0, 200) };
    return { ok: true };
  } catch (e) {
    console.error("filtre CinéCrush", e);
    return { ok: true };
  }
}
