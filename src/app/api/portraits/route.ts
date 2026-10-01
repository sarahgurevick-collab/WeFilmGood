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

/**
 * Les portraits proposés d'après les menus du personnage (01/10/2026) :
 * « Le personnage est… » et « Âge » deviennent quelques mots anglais,
 * auxquels Openverse répond bien (« old man portrait » : des centaines de
 * photos ; une phrase française : rien). Douze recherches possibles en
 * tout : chacune est gardée en mémoire une journée — Openverse limite les
 * appels anonymes — et l'on en tire six portraits au hasard à chaque fois.
 */
const MOTS_PROFIL: Record<string, Record<string, string>> = {
  homme: { enfant: "boy", adolescent: "teenage boy", adulte: "man", senior: "old man", "": "man" },
  femme: { enfant: "girl", adolescent: "teenage girl", adulte: "woman", senior: "old woman", "": "woman" },
  "": { enfant: "child", adolescent: "teenager", adulte: "person", senior: "old person", "": "" },
};

const UN_JOUR = 24 * 60 * 60 * 1000;
const reserve = new Map<string, { quand: number; portraits: Portrait[] }>();

async function portraitsDuProfil(genre: string, age: string): Promise<Portrait[]> {
  const mots = (MOTS_PROFIL[genre] ?? MOTS_PROFIL[""])[age] ?? "";
  if (!mots) return [];
  const garde = reserve.get(mots);
  if (garde && Date.now() - garde.quand < UN_JOUR) return garde.portraits;
  const pages = await Promise.allSettled(
    [1, 2, 3].map(async (page) => {
      const adresse =
        `https://api.openverse.org/v1/images/?q=${encodeURIComponent(`${mots} portrait`)}` +
        `&page_size=20&page=${page}&category=photograph&mature=false`;
      const r = await fetch(adresse, { headers: { "User-Agent": AGENT }, signal: AbortSignal.timeout(6000) });
      if (!r.ok) return [];
      const d = (await r.json()) as { results?: { title: string; thumbnail: string; url: string; license: string }[] };
      return (d.results ?? []).map((x) => ({
        apercu: x.thumbnail,
        url: x.url,
        titre: x.title,
        source: `Openverse (${x.license.toUpperCase()})`,
      }));
    }),
  );
  const vus = new Set<string>();
  const portraits = pages
    .flatMap((p) => (p.status === "fulfilled" ? p.value : []))
    .filter((p) => !vus.has(p.url) && vus.add(p.url));
  // Un échec n'est pas gardé : la prochaine demande réessaiera.
  if (portraits.length) reserve.set(mots, { quand: Date.now(), portraits });
  return portraits;
}

function auHasard<T>(liste: T[], combien: number): T[] {
  const melange = [...liste];
  for (let i = melange.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [melange[i], melange[j]] = [melange[j], melange[i]];
  }
  return melange.slice(0, combien);
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Réservé aux membres.", { status: 401 });

  const demande = new URL(req.url).searchParams;
  if (demande.has("genre") || demande.has("age")) {
    const genre = demande.get("genre") ?? "";
    const age = demande.get("age") ?? "";
    const tous = await portraitsDuProfil(genre === "autre" ? "" : genre, age);
    return Response.json({ portraits: auHasard(tous, 6) });
  }

  const q = (demande.get("q") ?? "").trim().slice(0, 80);
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
