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
  const d = (await r.json()) as {
    query?: { pages?: Record<string, { title: string; index: number; thumbnail?: { source: string } }> };
  };
  // Wikipédia range les pages par numéro, pas par pertinence : on remet la plus pertinente en premier.
  return Object.values(d.query?.pages ?? {})
    .sort((x, y) => x.index - y.index)
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
 * cherchés dans la banque de photos Pixabay (catégorie « people », filtre
 * tous publics) — à l'essai, deux fois plus de bons portraits qu'Openverse.
 * Douze recherches possibles en tout : chacune est gardée en mémoire une
 * journée, comme le demandent les conditions de Pixabay, et l'on en tire
 * six portraits au hasard à chaque fois. Les adresses rendues ne servent
 * qu'à l'affichage des propositions : le portrait retenu est copié sur
 * le site à l'enregistrement (pas de lien permanent vers Pixabay).
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
  const cle = process.env.PIXABAY_API_KEY;
  if (!mots || !cle) return [];
  const garde = reserve.get(mots);
  if (garde && Date.now() - garde.quand < UN_JOUR) return garde.portraits;
  let portraits: Portrait[] = [];
  try {
    const adresse =
      `https://pixabay.com/api/?key=${cle}&q=${encodeURIComponent(`${mots} portrait face`)}` +
      `&lang=en&image_type=photo&category=people&per_page=80&safesearch=true`;
    const r = await fetch(adresse, { signal: AbortSignal.timeout(6000) });
    if (r.ok) {
      const d = (await r.json()) as { hits?: { tags: string; webformatURL: string; largeImageURL: string }[] };
      portraits = (d.hits ?? []).map((x) => ({
        apercu: x.webformatURL,
        url: x.largeImageURL,
        titre: x.tags,
        source: "Pixabay",
      }));
    }
  } catch {
    // Pas de proposition cette fois.
  }
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

  // Le nom du personnage (07/10) : un personnage réel (« Victor Hugo », « Abbé
  // Boudet ») se retrouve sur Wikipédia. Seules les pages dont le titre
  // partage un mot du nom sont gardées, sinon un prénom seul ramènerait des
  // pages sans rapport.
  if (demande.has("perso")) {
    const mots = q
      .toLowerCase()
      .split(/[\s'’-]+/)
      .filter((m) => m.length >= 4 && !["abbé", "docteur", "docteure", "madame", "monsieur", "mademoiselle", "professeur", "capitaine", "commissaire"].includes(m));
    if (mots.length === 0) return Response.json({ portraits: [] });
    const trouves = await wikipedia("fr", q).catch(() => []);
    const gardes = trouves.filter((p) => mots.some((m) => p.titre.toLowerCase().includes(m)));
    return Response.json({ portraits: gardes.slice(0, 6) });
  }

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
