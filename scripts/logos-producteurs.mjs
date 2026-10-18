// Le logo de la société pour les producteurs sans photo (18/10/2026, Sarah).
// Le site est deviné par l'adresse email (@murchafilm.com → murchafilm.com) ;
// on y cherche le logo (image « logo » de l'en-tête, icône d'application,
// image de partage), on le pose en entier sur un carré blanc (il sera vu dans
// un rond), on le dépose dans le stockage des photos de profil, et on l'inscrit
// « a_valider » dans logos_producteurs. RIEN ne s'affiche sur le site avant
// que Sarah valide dans /admin/logos.
//
//   node scripts/logos-producteurs.mjs lot <combien> <dossier>
//       → <dossier>/images/<profile>.png et <dossier>/planche.jpg (contrôle)
//
// Une seule requête à la fois, avec une pause : on visite des sites de
// petites sociétés, pas question de les charger.
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const NAVIGATEUR = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function lire(url, binaire = false) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(url, { headers: { "user-agent": NAVIGATEUR, accept: binaire ? "image/*,*/*" : "text/html,*/*" }, redirect: "follow", signal: ctrl.signal });
    if (!r.ok) return null;
    if (binaire) {
      const buf = Buffer.from(await r.arrayBuffer());
      return buf.length > 0 && buf.length < 8_000_000 ? buf : null;
    }
    const texte = await r.text();
    return { html: texte.slice(0, 600_000), url: r.url };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

const attr = (balise, nom) => {
  const m = balise.match(new RegExp(`\\b${nom}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? (m[2] ?? m[3] ?? m[4] ?? "").trim() : null;
};

/** Les images candidates, de la plus probable à la moins probable. */
function candidats(html, base) {
  const liste = [];
  const ajouter = (src, score, genre) => {
    if (!src || src.startsWith("data:")) return;
    try {
      liste.push({ url: new URL(src.replace(/&amp;/g, "&"), base).href, score, genre });
    } catch {}
  };
  // 1. Une image de l'en-tête qui se dit « logo ».
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const b = m[0];
    const src = attr(b, "src") ?? attr(b, "data-src") ?? attr(b, "data-lazy-src");
    const indices = `${src ?? ""} ${attr(b, "alt") ?? ""} ${attr(b, "class") ?? ""} ${attr(b, "id") ?? ""}`.toLowerCase();
    if (/logo/.test(indices)) ajouter(src, m.index < 40_000 ? 10 : 7, "img-logo");
  }
  // 2. Les icônes déclarées par le site.
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const b = m[0];
    const rel = (attr(b, "rel") ?? "").toLowerCase();
    const href = attr(b, "href");
    if (rel.includes("apple-touch-icon")) ajouter(href, 6, "apple-touch-icon");
    else if (rel.includes("icon")) {
      const taille = parseInt((attr(b, "sizes") ?? "0").split("x")[0], 10) || 0;
      ajouter(href, href?.endsWith(".svg") ? 5 : taille >= 96 ? 4 : 1, "icon");
    }
  }
  // Pas d'image de partage (og:image) : à l'essai du 18/10 elle donnait une
  // photo publicitaire ou une affiche de film, jamais un logo.
  ajouter("/apple-touch-icon.png", 3, "apple-touch-icon");
  const vus = new Set();
  return liste.filter((c) => !vus.has(c.url) && vus.add(c.url)).sort((a, b) => b.score - a.score);
}

/**
 * Un logo clair sur fond transparent (fait pour un site sombre) disparaît
 * sur du blanc : on regarde la clarté moyenne de ses pixels visibles.
 */
async function estClair(buf) {
  const { data, info } = await sharp(buf, { failOn: "none", density: 150 }).resize(64, 64, { fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let visibles = 0, transparents = 0, lum = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i + 3] < 128) { transparents++; continue; }
    visibles++;
    lum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return visibles > 0 && transparents > visibles * 0.2 && lum / visibles > 200;
}

/** Le logo en entier sur un carré de 600 px, dans les 400 px du milieu (lisible dans un rond). Blanc, ou sombre pour un logo clair. */
async function preparer(buf) {
  const meta = await sharp(buf, { failOn: "none", density: 300 }).metadata();
  if (!meta.width || !meta.height) return null;
  const vectoriel = meta.format === "svg";
  if (!vectoriel && Math.max(meta.width, meta.height) < 90) return null; // trop petit, serait flou
  const ratio = meta.width / meta.height;
  if (ratio > 6 || ratio < 1 / 4) return null;
  const fond = (await estClair(buf)) ? "#1a1a1a" : "#ffffff";
  let image = sharp(buf, { failOn: "none", density: 300 }).flatten({ background: fond });
  try {
    image = sharp(await image.png().toBuffer()).trim({ threshold: 12 });
  } catch {}
  const interieur = await image.resize(400, 400, { fit: "contain", background: fond }).png().toBuffer();
  return sharp({ create: { width: 600, height: 600, channels: 3, background: fond } })
    .composite([{ input: interieur, top: 100, left: 100 }])
    .png()
    .toBuffer();
}

async function chercherLogo(domaine) {
  for (const adresse of [`https://${domaine}`, `https://www.${domaine}`, `http://${domaine}`]) {
    const page = await lire(adresse);
    if (!page || page.html.length < 200) continue;
    for (const c of candidats(page.html, page.url).slice(0, 6)) {
      const buf = await lire(c.url, true);
      if (!buf) continue;
      try {
        const png = await preparer(buf);
        if (png) return { page: page.url, image: c.url, genre: c.genre, png };
      } catch {}
    }
    return { page: page.url, image: null };
  }
  return null;
}

async function planche(dossier, faits) {
  const L = 240, H = 290, COL = 6;
  const tuiles = [];
  for (let i = 0; i < faits.length; i++) {
    const f = faits[i];
    const img = await sharp(join(dossier, "images", `${f.profile_id}.png`)).resize(L, L).toBuffer();
    const txt = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").slice(0, 30);
    const etiquette = Buffer.from(`<svg width="${L}" height="${H - L}"><rect width="100%" height="100%" fill="#222"/><text x="6" y="18" font-size="13" fill="#fff" font-family="sans-serif">${i + 1} · ${txt(f.domaine)}</text><text x="6" y="38" font-size="12" fill="#ccc" font-family="sans-serif">${txt(f.societe ?? f.nom)} · ${txt(f.genre)}</text></svg>`);
    tuiles.push({
      input: await sharp({ create: { width: L, height: H, channels: 3, background: "#222" } }).composite([{ input: img, top: 0, left: 0 }, { input: etiquette, top: L, left: 0 }]).jpeg().toBuffer(),
      top: Math.floor(i / COL) * H,
      left: (i % COL) * L,
    });
  }
  if (!tuiles.length) return;
  await sharp({ create: { width: L * COL, height: Math.ceil(faits.length / COL) * H, channels: 3, background: "#000" } })
    .composite(tuiles)
    .jpeg({ quality: 85 })
    .toFile(join(dossier, "planche.jpg"));
}

const [commande, combien, dossier] = process.argv.slice(2);
if (commande !== "lot" || !dossier) {
  console.log("Usage : node scripts/logos-producteurs.mjs lot <combien> <dossier>");
  process.exit(1);
}
mkdirSync(join(dossier, "images"), { recursive: true });
const lot = dossier.split("/").filter(Boolean).pop();
// IDS=a,b,c : refaire seulement ces producteurs (après avoir effacé leur ligne).
const ids = (process.env.IDS ?? "").split(",").filter(Boolean);
const { data: tous, error } = await supabase.rpc("producteurs_a_logo", { p_limite: ids.length ? 5000 : Number(combien) || 30 });
if (error) throw error;
const producteurs = ids.length ? tous.filter((p) => ids.includes(p.profile_id)) : tous;

const faits = [];
let introuvables = 0;
for (const p of producteurs) {
  const r = await chercherLogo(p.domaine);
  if (!r?.image) {
    introuvables++;
    await supabase.from("logos_producteurs").upsert({
      profile_id: p.profile_id, domaine: p.domaine, page_source: r?.page ?? null, statut: "introuvable",
      note: r ? "Site trouvé, aucun logo exploitable" : "Site injoignable", lot, traite_le: new Date().toISOString(),
    });
    continue;
  }
  writeFileSync(join(dossier, "images", `${p.profile_id}.png`), r.png);
  const chemin = `${p.profile_id}/logo-${Date.now()}.png`;
  const { error: e } = await supabase.storage.from("avatars").upload(chemin, r.png, { contentType: "image/png" });
  if (e) {
    console.error(p.domaine, e.message);
    continue;
  }
  const url = supabase.storage.from("avatars").getPublicUrl(chemin).data.publicUrl;
  await supabase.from("logos_producteurs").upsert({
    profile_id: p.profile_id, domaine: p.domaine, page_source: r.page, image_source: r.image,
    url_logo: url, statut: "a_valider", note: r.genre, lot,
  });
  faits.push({ ...p, genre: r.genre });
  await pause(800);
}
writeFileSync(join(dossier, "faits.json"), JSON.stringify(faits, null, 1));
await planche(dossier, faits);
console.log(`${producteurs.length} producteurs : ${faits.length} logos à valider, ${introuvables} introuvables. Planche : ${join(dossier, "planche.jpg")}`);
