import { createClient } from "@/lib/supabase/server";

/**
 * Chercher un portrait sur internet pour un personnage (28/09/2026) :
 * « Juliette Binoche » → des photos libres, depuis Wikipédia (fr, en) et
 * Openverse (images sous licence Creative Commons). Aucune clé, aucun
 * coût. Réservé aux membres connectés ; la plateforme est fermée.
 */
type Portrait = { apercu: string; url: string; titre: string; source: string };

const AGENT = "WeFilmGood/1.0 (https://app.wefilmgood.com)";

async function wikipedia(langue: "fr" | "en", q: string): Promise<Portrait[]> {
  const adresse =
    `https://${langue}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}` +
    `&gsrlimit=8&prop=pageimages&piprop=thumbnail&pithumbsize=600&format=json`;
  const r = await fetch(adresse, { headers: { "User-Agent": AGENT }, signal: AbortSignal.timeout(6000) });
  if (!r.ok) return [];
  const d = (await r.json()) as { query?: { pages?: Record<string, { title: string; thumbnail?: { source: string } }> } };
  return Object.values(d.query?.pages ?? {})
    .filter((p) => p.thumbnail?.source)
    .map((p) => ({
      apercu: p.thumbnail!.source,
      url: p.thumbnail!.source,
      titre: p.title,
      source: `Wikipédia (${langue})`,
    }));
}

async function openverse(q: string): Promise<Portrait[]> {
  const adresse = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=12&mature=false`;
  const r = await fetch(adresse, { headers: { "User-Agent": AGENT }, signal: AbortSignal.timeout(6000) });
  if (!r.ok) return [];
  const d = (await r.json()) as { results?: { title: string; thumbnail: string; url: string; license: string }[] };
  return (d.results ?? []).map((x) => ({
    apercu: x.thumbnail,
    url: x.url,
    titre: x.title,
    source: `Openverse (${x.license.toUpperCase()})`,
  }));
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Réservé aux membres.", { status: 401 });

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return Response.json({ portraits: [] });

  const lots = await Promise.allSettled([wikipedia("fr", q), wikipedia("en", q), openverse(q)]);
  const vus = new Set<string>();
  const portraits: Portrait[] = [];
  for (const lot of lots) {
    if (lot.status !== "fulfilled") continue;
    for (const p of lot.value) {
      if (vus.has(p.url)) continue;
      vus.add(p.url);
      portraits.push(p);
    }
  }
  return Response.json({ portraits: portraits.slice(0, 18) });
}
