import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import { FESTIVALS } from "@/data/festivals";
import { createClient } from "@/lib/supabase/server";
import { decouperLigne, separerAuteurs } from "@/app/notre-histoire/rapprochement";
import NavAdmin from "../NavAdmin";
import styles from "../admin.module.css";
import CreerProfil, { type FicheProposee } from "./CreerProfil";

/** Avant 2016, WFG 1 n'existait pas : ces auteurs n'ont jamais eu de compte. */
const AVANT = 2016;

type Candidat = {
  cle: string;
  noms: { nom: string; inverse: boolean }[];
  selections: { festival: string; libelle: string; annee: number; titre: string }[];
};

/* Le libellé de la sélection sur une fiche projet (project_selections). */
const LIBELLE_SELECTION: Record<string, string> = {
  cannes: "Cannes",
  "clermont-ferrand": "Clermont",
  pcdv: "PCDV",
  "serie-mania": "SerieMania",
  "satis-vr": "Satis",
};

/* Les projets d'un auteur, un par titre (« LNA » à Cannes 2013 et au PCDV
   2015 = une seule fiche, deux sélections). */
function fichesDe(c: Candidat): FicheProposee[] {
  const parTitre = new Map<string, FicheProposee>();
  for (const s of c.selections) {
    const k = cle(s.titre);
    const f = parTitre.get(k) ?? { titre: s.titre, lignes: [], selections: [] };
    const ligne = `${s.annee} · ${s.festival}`;
    if (!f.lignes.includes(ligne)) f.lignes.push(ligne);
    if (!f.selections.includes(s.libelle)) f.selections.push(s.libelle);
    parTitre.set(k, f);
  }
  return [...parTitre.values()];
}

const cle = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .sort()
    .join(" ");

const PARTICULES = new Set(["le", "la", "de", "des", "du", "d", "van", "von", "da", "di", "del", "mc", "y"]);

/* Prénom et nom proposés, à corriger par Sarah. En 2014 à Cannes, les noms
   sont écrits « Nom Prénom » ; ailleurs « Prénom Nom ». */
function couper(nom: string, inverse: boolean): { prenom: string; nom: string } {
  const mots = nom.split(/\s+/).filter(Boolean);
  if (mots.length < 2) return { prenom: mots[0] ?? "", nom: "" };
  if (inverse) return { prenom: mots[mots.length - 1], nom: mots.slice(0, -1).join(" ") };
  let debut = mots.length - 1;
  while (debut > 1 && PARTICULES.has(mots[debut - 1].toLowerCase())) debut--;
  return { prenom: mots.slice(0, debut).join(" "), nom: mots.slice(debut).join(" ") };
}

/**
 * Les auteurs sélectionnés avant WFG 1 qui n'ont aucun profil (25/10/2026,
 * Sarah). Liste tirée des sélections de « Notre histoire » ; un profil créé
 * disparaît de la liste au prochain affichage, et son nom devient cliquable
 * dans les sélections.
 */
export default async function AuteursSelectionnesPage() {
  const supabase = await createClient();
  const { data: admin } = await supabase.rpc("is_admin");
  if (admin !== true) redirect("/");

  const parCle = new Map<string, Candidat>();
  for (const f of FESTIVALS) {
    for (const s of f.selections) {
      if (!s.annee || s.annee >= AVANT) continue;
      for (const b of s.blocs) {
        for (const brut of b.entrees) {
          const l = decouperLigne(brut);
          const titre = l.titre.replace(/^[^\p{L}\p{N}]+/u, "").replace(/^["«»“”]+/, "").trim();
          for (const nom of separerAuteurs(l.auteur)) {
            const k = cle(nom);
            if (!k) continue;
            const c = parCle.get(k) ?? { cle: k, noms: [], selections: [] };
            const inverse = f.id === "cannes" && s.annee === 2014;
            if (!c.noms.some((n) => n.nom === nom)) c.noms.push({ nom, inverse });
            c.selections.push({ festival: f.nom, libelle: `${LIBELLE_SELECTION[f.id] ?? f.nom} ${s.annee}`, annee: s.annee, titre });
            parCle.set(k, c);
          }
        }
      }
    }
  }
  const tous = [...parCle.values()];
  const [{ data: sans }, { data: crees }, { data: adresses }] = await Promise.all([
    supabase.rpc("noms_sans_profil", { noms: tous.map((c) => c.noms[0].nom) }),
    supabase.rpc("profils_auteurs_selectionnes"),
    supabase.from("adresses_auteurs_selectionnes").select("cle, email"),
  ]);
  const indices = new Set(((sans ?? []) as { idx: number }[]).map((r) => r.idx));
  // Les profils déjà créés d'ici, retrouvés par le nom (mêmes mots, tout ordre).
  const creeDe = new Map<string, { id: string; nom: string; avatar: string | null }>();
  for (const p of (crees ?? []) as { id: string; full_name: string | null; first_name: string | null; last_name: string | null; avatar_url: string | null }[]) {
    const fiche = { id: p.id, nom: p.full_name ?? "", avatar: p.avatar_url };
    for (const n of [p.full_name, `${p.first_name ?? ""} ${p.last_name ?? ""}`]) if (n?.trim()) creeDe.set(cle(n), fiche);
  }
  const adresseDe = new Map(((adresses ?? []) as { cle: string; email: string }[]).map((a) => [a.cle, a.email]));
  const candidats = tous
    .filter((c, i) => indices.has(i) || c.noms.some((n) => creeDe.has(cle(n.nom))))
    .map((c) => {
      // Une écriture « Prénom Nom » d'un autre festival l'emporte sur 2014 à Cannes.
      const n = c.noms.find((x) => !x.inverse) ?? c.noms[0];
      const dejaCree = c.noms.map((x) => creeDe.get(cle(x.nom))).find(Boolean);
      return {
        ...c,
        propose: couper(n.nom, n.inverse),
        premiere: Math.min(...c.selections.map((s) => s.annee)),
        email: adresseDe.get(c.cle) ?? "",
        dejaCree,
      };
    })
    .sort((a, b) => a.premiere - b.premiere || a.propose.nom.localeCompare(b.propose.nom, "fr"));

  return (
    <PageShell nav="admin" avantTitre={<NavAdmin />} title="Auteurs sélectionnés sans profil" theme="clair">
      <table className={styles.table}>
        <tbody>
          {candidats.map((c) => (
            <tr key={c.cle}>
              <CreerProfil
                prenom={c.propose.prenom}
                nom={c.propose.nom}
                email={c.email}
                fiches={fichesDe(c)}
                dejaCree={c.dejaCree}
              />
            </tr>
          ))}
        </tbody>
      </table>
    </PageShell>
  );
}
