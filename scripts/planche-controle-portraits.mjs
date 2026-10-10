// Planche de contrôle d'une part de portraits : les photos posées
// (images/pose-<id>.jpg), entières (fit: contain), avec k, nom, avis et note.
// À regarder à l'œil avant de passer à la part suivante : les sous-agents
// laissent passer des images générées par ordinateur ou des poses déplacées.
//   node scripts/planche-controle-portraits.mjs <dossier> <N>
import { readFileSync, existsSync } from "node:fs";
import sharp from "sharp";

const [dossier, n] = process.argv.slice(2);
const part = JSON.parse(readFileSync(`${dossier}/part-${n}.json`, "utf8"));
const choix = JSON.parse(readFileSync(`${dossier}/choix-${n}.json`, "utf8"));
const posees = part.filter((p) => choix[p.k]?.n !== null && choix[p.k]?.n !== undefined && existsSync(`${dossier}/images/pose-${p.id}.jpg`));
const L = 260, H = 300, COL = 5, TEXTE = 70;
const lignes = Math.ceil(posees.length / COL);
const vignettes = [];
for (let i = 0; i < posees.length; i++) {
  const p = posees[i];
  const c = choix[p.k];
  const img = await sharp(`${dossier}/images/pose-${p.id}.jpg`).resize(L, H - TEXTE, { fit: "contain", background: "#222" }).toBuffer();
  const echapper = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const note = echapper((c.note ?? "").slice(0, 44));
  const etiquette = Buffer.from(`<svg width="${L}" height="${TEXTE}"><rect width="100%" height="100%" fill="${c.avis === "bon" ? "#1e4d2b" : "#5a4a10"}"/><text x="6" y="20" font-size="15" fill="#fff" font-family="sans-serif">k${p.k} · ${echapper(p.nom.slice(0, 22))}</text><text x="6" y="40" font-size="13" fill="#fff" font-family="sans-serif">${c.avis} · ${echapper(p.genre ?? "")} ${echapper(p.age ?? "")}</text><text x="6" y="60" font-size="12" fill="#ddd" font-family="sans-serif">${note}</text></svg>`);
  vignettes.push({ input: await sharp({ create: { width: L, height: H, channels: 3, background: "#222" } }).composite([{ input: img, top: 0, left: 0 }, { input: etiquette, top: H - TEXTE, left: 0 }]).jpeg().toBuffer(), top: Math.floor(i / COL) * H, left: (i % COL) * L });
}
const sortie = `${dossier}/controle-${n}.jpg`;
await sharp({ create: { width: L * COL, height: Math.max(1, lignes) * H, channels: 3, background: "#000" } }).composite(vignettes).jpeg({ quality: 85 }).toFile(sortie);
console.log(`${posees.length} portraits posés sur la planche ${sortie}`);
