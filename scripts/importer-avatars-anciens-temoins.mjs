// Les photos de profil des anciens membres de WFG 1 qui ont un témoignage
// public et n'ont pas encore réclamé leur profil (14/10/2026). Lues dans
// ~/imports/extrait/img/avatars/<user_id>.ext, allégées, déposées dans le
// bucket avatars sous anciens/<user_id>/, adresse écrite dans
// legacy_profiles.avatar_url (migration 0158). Idempotent : une photo déjà
// posée n'est pas redéposée.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const DOSSIER = "/home/wfg/imports/extrait/img/avatars";
const LARGEUR_MAX = 600;

async function alleger(chemin) {
  const origine = readFileSync(chemin);
  try {
    const image = sharp(origine, { failOn: "none" }).rotate();
    const infos = await image.metadata();
    const transparent = infos.hasAlpha === true;
    const redim = image.resize({ width: LARGEUR_MAX, withoutEnlargement: true });
    const donnees = transparent
      ? await redim.png({ compressionLevel: 9, palette: true }).toBuffer()
      : await redim.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    if (donnees.length >= origine.length) return { donnees: origine, type: "image/jpeg" };
    return { donnees, type: transparent ? "image/png" : "image/jpeg" };
  } catch {
    return { donnees: origine, type: "image/jpeg" };
  }
}

const { data: anciens, error } = await supabase
  .from("legacy_profiles")
  .select("legacy_user_id, avatar_url")
  .is("claimed_by", null)
  .eq("testimonial_is_public", true)
  .not("testimonial", "is", null);
if (error) throw error;

const fichiers = new Map();
for (const f of readdirSync(DOSSIER)) {
  const id = f.split(".")[0];
  if (/^\d+$/.test(id)) fichiers.set(Number(id), f);
}

let poses = 0, dejaLa = 0, sansFichier = 0, echoues = 0;
for (const a of anciens) {
  if (a.avatar_url) { dejaLa++; continue; }
  const f = fichiers.get(a.legacy_user_id);
  if (!f) { sansFichier++; continue; }
  try {
    const { donnees, type } = await alleger(join(DOSSIER, f));
    const chemin = `anciens/${a.legacy_user_id}/avatar-${Date.now()}`;
    const { error: e1 } = await supabase.storage.from("avatars").upload(chemin, donnees, { contentType: type, upsert: true });
    if (e1) throw e1;
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(chemin);
    const { error: e2 } = await supabase
      .from("legacy_profiles")
      .update({ avatar_url: pub.publicUrl })
      .eq("legacy_user_id", a.legacy_user_id);
    if (e2) throw e2;
    poses++;
  } catch (e) {
    echoues++;
    console.error("avatar", a.legacy_user_id, e.message ?? e);
  }
}
console.log(`${anciens.length} anciens témoins : ${poses} photos posées, ${dejaLa} déjà là, ${sansFichier} sans fichier, ${echoues} échouées`);
