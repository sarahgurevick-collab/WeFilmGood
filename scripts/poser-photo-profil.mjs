// Pose une photo sur un profil, comme un envoi depuis /profil : original +
// carré cadré, avatar_original_path, point de cadrage (28/11/2026, Sarah
// envoie des photos trouvées pour des auteurs sans portrait).
// Refuse d'écraser une photo existante, sauf avec --remplacer.
//   node scripts/poser-photo-profil.mjs <profile_id> <fichier image> [--remplacer]
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const [id, fichier] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const REMPLACER = process.argv.includes("--remplacer");
if (!id || !fichier) throw new Error("usage : node scripts/poser-photo-profil.mjs <profile_id> <fichier> [--remplacer]");

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]),
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: p, error: e1 } = await supabase.from("profiles").select("id, full_name, avatar_url").eq("id", id).single();
if (e1) throw new Error(e1.message);
if (p.avatar_url && !REMPLACER) throw new Error(`${p.full_name} a déjà une photo (ajouter --remplacer)`);

const original = await sharp(readFileSync(fichier), { failOn: "none" })
  .rotate()
  .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
  .jpeg({ quality: 82, mozjpeg: true })
  .toBuffer();
const { info, data: carre } = await sharp(original)
  .resize(600, 600, { fit: "cover", position: sharp.strategy.attention })
  .jpeg({ quality: 84, mozjpeg: true })
  .toBuffer({ resolveWithObject: true });
const { width = 0, height = 0 } = await sharp(original).metadata();
const cote = Math.min(width, height);
const centre = (point, taille, defaut) =>
  point === undefined || taille <= cote ? defaut : Math.round(Math.min(100, Math.max(0, ((point - cote / 2) / (taille - cote)) * 100)));

const h = Date.now();
const cheminOriginal = `${id}/original-${h}.jpg`;
const chemin = `${id}/avatar-${h}.jpg`;
for (const [c, d] of [[cheminOriginal, original], [chemin, carre]]) {
  const r = await supabase.storage.from("avatars").upload(c, d, { contentType: "image/jpeg" });
  if (r.error) throw new Error(r.error.message);
}
const publicUrl = supabase.storage.from("avatars").getPublicUrl(chemin).data.publicUrl;
const r = await supabase
  .from("profiles")
  .update({
    avatar_url: publicUrl,
    avatar_original_path: cheminOriginal,
    photo_x: centre(info.attentionX, width, 50),
    photo_y: centre(info.attentionY, height, 20),
  })
  .eq("id", id);
if (r.error) throw new Error(r.error.message);
console.log(`${p.full_name} : photo posée (${publicUrl})`);
