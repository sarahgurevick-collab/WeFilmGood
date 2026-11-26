import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import { FESTIVALS } from "@/data/festivals";
import { createClient } from "@/lib/supabase/server";
import { decouperLigne, separerAuteurs } from "@/app/notre-histoire/rapprochement";
import NavAdmin from "../NavAdmin";
import styles from "../admin.module.css";
import Trancher from "./Trancher";

/**
 * Les noms des listes de sélection qui n'ont aucun profil au même nom, mais
 * un profil au nom très proche (26/11/2026, Sarah : « un onglet dans l'admin
 * et je m'occupe de remplacer », plutôt qu'un export). « Show Shun Lee » dans
 * la liste, « Show Chun Lee » sur le site : la création du profil butait sur
 * « adresse déjà utilisée ». Sarah tranche ligne par ligne ; la décision est
 * gardée dans selections_noms_rapproches (0332).
 *
 * Toutes les années sont regardées, pas seulement celles d'avant WFG 1 :
 * un nom rapproché devient aussi cliquable dans « Notre histoire ».
 */

type Proche = { idx: number; profile_id: string; nom: string; email: string | null; projets: string | null };

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

export default async function NomsProchesPage() {
  const supabase = await createClient();
  const { data: admin } = await supabase.rpc("is_admin");
  if (admin !== true) redirect("/");

  // Chaque nom des listes, avec ses sélections (« 2014 · Festival de Cannes · Titre »).
  const parCle = new Map<string, { cle: string; nom: string; lignes: string[] }>();
  for (const f of FESTIVALS) {
    for (const s of f.selections) {
      for (const b of s.blocs) {
        for (const brut of b.entrees) {
          const l = decouperLigne(brut);
          const titre = l.titre.replace(/^[^\p{L}\p{N}]+/u, "").replace(/^["«»“”]+/, "").trim();
          for (const nom of separerAuteurs(l.auteur)) {
            const k = cle(nom);
            if (!k || !k.includes(" ")) continue;
            const c = parCle.get(k) ?? { cle: k, nom, lignes: [] };
            const ligne = [s.annee, f.nom, titre].filter(Boolean).join(" · ");
            if (!c.lignes.includes(ligne)) c.lignes.push(ligne);
            parCle.set(k, c);
          }
        }
      }
    }
  }
  const tous = [...parCle.values()];
  const { data } = await supabase.rpc("noms_proches", { noms: tous.map((c) => c.nom) });
  const lignes = ((data ?? []) as Proche[])
    .map((p) => ({ ...p, liste: tous[p.idx] }))
    .filter((p) => p.liste)
    .sort((a, b) => a.liste.nom.localeCompare(b.liste.nom, "fr") || a.nom.localeCompare(b.nom, "fr"));

  return (
    <PageShell nav="admin" avantTitre={<NavAdmin />} title="Noms proches" theme="clair">
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Nom dans les sélections</th>
            <th>Profil</th>
            <th>Projets du profil</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {lignes.map((p) => (
            <tr key={`${p.liste.cle}-${p.profile_id}`}>
              <td>
                <strong style={{ fontSize: 14 }}>{p.liste.nom}</strong>
                {p.liste.lignes.map((l) => (
                  <div key={l} style={{ opacity: 0.75 }}>
                    {l}
                  </div>
                ))}
              </td>
              <td>
                <Link href={`/membres/${p.profile_id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, textDecoration: "underline" }}>
                  {p.nom || "Sans nom"}
                </Link>
                {p.email && <div style={{ opacity: 0.75 }}>{p.email}</div>}
              </td>
              <td>{p.projets ?? ""}</td>
              <td>
                <Trancher cle={p.liste.cle} nom={p.liste.nom} profileId={p.profile_id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </PageShell>
  );
}
