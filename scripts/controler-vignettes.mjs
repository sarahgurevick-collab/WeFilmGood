// Contrôle des vignettes de projets (03/10/2026) : repère celles qui ne
// s'ouvrent pas, sont trop petites ou de mauvaises proportions (les cartes
// sont en 16/9), ou ressemblent à une page de texte (page de scénario,
// capture). Lecture seule : ne modifie ni la base ni le stockage.
//   node scripts/controler-vignettes.mjs <sortie.json>
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]),
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const lignes = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await supabase
    .from("project_files")
    .select("project_id, storage_path, original_name, project:projects(title, status)")
    .eq("kind", "vignette")
    .order("id")
    .range(de, de + 999);
  if (error) throw new Error(error.message);
  lignes.push(...data);
  if (data.length < 1000) break;
}
console.log(lignes.length, "vignettes");

async function controler(l) {
  const r = { projet: l.project_id, titre: l.project?.title ?? "", statut: l.project?.status ?? "", chemin: l.storage_path, nom: l.original_name ?? "" };
  try {
    const { data, error } = await supabase.storage.from("project-media").download(l.storage_path);
    if (error || !data) return { ...r, probleme: "introuvable", detail: error?.message ?? "" };
    const buf = Buffer.from(await data.arrayBuffer());
    r.octets = buf.length;
    let img;
    try {
      img = sharp(buf);
      const m = await img.metadata();
      r.l = m.width; r.h = m.height; r.format = m.format;
    } catch {
      return { ...r, probleme: "illisible" };
    }
    if (!r.l || !r.h) return { ...r, probleme: "illisible" };
    r.ratio = +(r.l / r.h).toFixed(2);
    const problemes = [];
    if (r.octets < 3000) problemes.push("minuscule (fichier)");
    if (r.l < 400 || r.h < 225) problemes.push("trop petite");
    if (r.ratio < 1.2 || r.ratio > 2.6) problemes.push("proportions");
    // Page de texte : très claire, presque sans couleur, beaucoup de fines lignes.
    const petit = await sharp(buf).resize(200, 200, { fit: "inside" }).flatten({ background: "#fff" }).raw().toBuffer({ resolveWithObject: true });
    const { data: px, info } = petit;
    let clair = 0, gris = 0, n = info.width * info.height;
    let somme = 0;
    for (let i = 0; i < n; i++) {
      const R = px[i * info.channels], G = px[i * info.channels + 1], B = px[i * info.channels + 2];
      const lum = (R + G + B) / 3;
      somme += lum;
      if (lum > 225) clair++;
      if (Math.max(R, G, B) - Math.min(R, G, B) < 18) gris++;
    }
    r.clair = +(clair / n).toFixed(2); r.gris = +(gris / n).toFixed(2); r.lum = Math.round(somme / n);
    if (r.clair > 0.78 && r.gris > 0.92) problemes.push("page de texte ?");
    if (r.lum < 12) problemes.push("quasi noire");
    if (r.lum > 245) problemes.push("quasi blanche");
    if (problemes.length) return { ...r, probleme: problemes.join(", ") };
    return { ...r, probleme: "" };
  } catch (e) {
    return { ...r, probleme: "erreur", detail: String(e.message ?? e) };
  }
}

const sortie = [];
let fait = 0;
const file = [...lignes];
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (file.length) {
      const l = file.shift();
      sortie.push(await controler(l));
      if (++fait % 500 === 0) console.log(fait);
    }
  }),
);
writeFileSync(process.argv[2], JSON.stringify(sortie));
const par = {};
for (const s of sortie) if (s.probleme) for (const p of s.probleme.split(", ")) par[p] = (par[p] ?? 0) + 1;
console.log("terminé", sortie.length, par);
