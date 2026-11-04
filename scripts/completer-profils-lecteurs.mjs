// Complète les profils des lecteurs de WFG 2 avec ce que WFG 1 savait d'eux
// (04/11/2026, Sarah : « pas de photo ni de contact tél pour Fustini ») :
//   - la photo (~/imports/extrait/img/avatars/<user_id>.<ext>), déposée comme
//     un envoi depuis /profil : original + carré cadré, avatar_original_path ;
//   - le téléphone, l'adresse et le code postal (wfg1.accounts) dans
//     profile_private_details, que seule l'équipe voit (comme un membre) ;
//   - les formats lus (user_data reader_lm / reader_cm / reader_series / reader_vr)
//     dans reader_profiles.formats.
// Le genre n'est pas repris. Rien n'est écrasé : seuls les champs vides sont
// remplis. Lancer sans argument pour voir, avec --ecrire pour écrire.
//   node scripts/completer-profils-lecteurs.mjs [--ecrire]
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const ECRIRE = process.argv.includes("--ecrire");
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]),
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const DOSSIER = "/home/wfg/imports/extrait/img/avatars";
const fichiers = readdirSync(DOSSIER);

// Le schéma wfg1 n'est pas exposé à l'API : on le lit directement dans la base.
const sql = (q) =>
  JSON.parse(execFileSync("docker", ["exec", "supabase-db", "psql", "-U", "postgres", "-At", "-c", q], { encoding: "utf8" }).trim() || "[]");
const anciens = sql(`select coalesce(json_agg(json_build_object(
    'user_id', a.user_id, 'phone', nullif(trim(a.phone), ''),
    'address', nullif(trim(a.address), ''), 'postal_code', nullif(trim(a.postal_code), ''),
    'formats', (select coalesce(json_agg(u.name), '[]') from wfg1.user_data u
                where u.user_id = a.user_id and u.value = '1'
                  and u.name in ('reader_lm','reader_cm','reader_series','reader_vr'))
  )), '[]') from wfg1.accounts a where a.role = 'reader'`);
const parId = new Map(anciens.map((a) => [a.user_id, a]));
const FORMATS = { reader_lm: "long_metrage", reader_cm: "court_metrage", reader_series: "serie", reader_vr: "immersif_360_vr" };

const { data: lecteurs, error } = await supabase
  .from("reader_profiles")
  .select("profile_id, formats, profile:profiles(full_name, legacy_user_id, avatar_url)");
if (error) throw new Error(error.message);
const { data: prives } = await supabase.from("profile_private_details").select("profile_id, phone, address, postal_code");
const priveDe = new Map((prives ?? []).map((c) => [c.profile_id, c]));

for (const l of lecteurs) {
  const p = l.profile;
  const ancien = p?.legacy_user_id != null ? parId.get(p.legacy_user_id) : null;
  if (!ancien) continue;
  const faits = [];

  // Le téléphone, l'adresse, le code postal : seulement ce qui manque.
  const prive = priveDe.get(l.profile_id) ?? {};
  const aPoser = {};
  for (const champ of ["phone", "address", "postal_code"]) if (ancien[champ] && !prive[champ]) aPoser[champ] = ancien[champ];
  if (Object.keys(aPoser).length) {
    faits.push(Object.entries(aPoser).map(([k, v]) => `${k} ${v}`).join(", "));
    if (ECRIRE) {
      const r = await supabase
        .from("profile_private_details")
        .upsert({ profile_id: l.profile_id, ...prive, ...aPoser, updated_at: new Date().toISOString() });
      if (r.error) throw new Error(r.error.message);
    }
  }

  // Les formats : seulement si WFG 1 en cochait au moins un (aucun = on laisse « tous »).
  if (l.formats == null && ancien.formats.length) {
    const formats = ancien.formats.map((f) => FORMATS[f]);
    faits.push(`formats ${formats.join(",")}`);
    if (ECRIRE) {
      const r = await supabase.from("reader_profiles").update({ formats }).eq("profile_id", l.profile_id);
      if (r.error) throw new Error(r.error.message);
    }
  }

  // La photo.
  const fichier = fichiers.find((f) => f.slice(0, f.lastIndexOf(".")) === String(p.legacy_user_id));
  if (!p.avatar_url && fichier) {
    faits.push(`photo ${fichier}`);
    if (ECRIRE) {
      const brut = readFileSync(`${DOSSIER}/${fichier}`);
      const original = await sharp(brut, { failOn: "none" })
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
      const cheminOriginal = `${l.profile_id}/original-${h}.jpg`;
      const chemin = `${l.profile_id}/avatar-${h}.jpg`;
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
        .eq("id", l.profile_id);
      if (r.error) throw new Error(r.error.message);
    }
  }

  if (faits.length) console.log(`${p.full_name} : ${faits.join(" ; ")}`);
}
console.log(ECRIRE ? "Écrit." : "Aperçu seulement (ajouter --ecrire pour écrire).");
