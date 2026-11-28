import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { photoNette } from "@/lib/photo";
import NavAdmin from "../NavAdmin";
import styles from "../admin.module.css";
import Trancher from "./Trancher";

/**
 * Femme ou homme des auteurs, pour les statistiques (28/11/2026, Sarah :
 * « c'est pas plus simple de directement le faire sur un onglet ? », plutôt
 * qu'un fichier à renvoyer). Posé d'après la case de WFG 1 et le prénom
 * (0336) ; ici, les cas douteux à trancher, puis ceux devinés, à contrôler
 * si besoin. Rien de tout cela n'est visible des membres.
 */

type Ligne = {
  profile_id: string;
  prenom: string | null;
  nom: string | null;
  valeur: "femme" | "homme" | null;
  source: string;
  wfg1: string | null;
  projets: string | null;
  photo: string | null;
};

export default async function FemmeHommePage() {
  const supabase = await createClient();
  const { data: admin } = await supabase.rpc("is_admin");
  if (admin !== true) redirect("/");

  const { data } = await supabase.rpc("femme_homme_a_trancher");
  const lignes = (data ?? []) as Ligne[];
  const groupes = [
    { titre: "À vérifier", lignes: lignes.filter((l) => l.source === "a verifier") },
    {
      titre: "Devinés d'après le prénom (à contrôler si besoin)",
      lignes: lignes.filter((l) => l.source === "prenom (avis Claude)" || l.source === "prenom (corrige wfg1)"),
    },
    { titre: "Déjà tranchés par toi", lignes: lignes.filter((l) => l.source === "Sarah" || l.source === "laisse de cote") },
  ];

  return (
    <PageShell nav="admin" avantTitre={<NavAdmin />} title="Femme / homme" theme="clair">
      {groupes.map((g) => (
        <section key={g.titre} style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 18, margin: "0 0 12px" }}>
            {g.titre} ({g.lignes.length})
          </h2>
          {g.lignes.length > 0 && (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th />
                  <th>Auteur</th>
                  <th>Case de WFG 1</th>
                  <th>Projets</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {g.lignes.map((l) => {
                  const nomComplet = [l.prenom, l.nom].filter(Boolean).join(" ").trim();
                  return (
                    <tr key={l.profile_id}>
                      <td style={{ width: 72 }}>
                        {l.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photoNette(l.photo) ?? undefined}
                            alt=""
                            style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", display: "block" }}
                          />
                        ) : (
                          <span style={{ display: "block", width: 64, height: 64, borderRadius: "50%", background: "#eee" }} />
                        )}
                      </td>
                      <td>
                        <Link
                          href={`/membres/${l.profile_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: 14, textDecoration: "underline" }}
                        >
                          {nomComplet || "Sans nom"}
                        </Link>
                        {nomComplet && (
                          <div>
                            <a
                              href={`https://www.google.com/search?q=${encodeURIComponent(`"${nomComplet}" cinéma`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: 12, opacity: 0.75, textDecoration: "underline" }}
                            >
                              Chercher sur internet
                            </a>
                          </div>
                        )}
                      </td>
                      <td>{l.wfg1 ?? ""}</td>
                      <td>{l.projets ?? ""}</td>
                      <td>
                        <Trancher
                          profileId={l.profile_id}
                          actuel={l.source === "a verifier" ? "vide" : l.valeur}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      ))}
    </PageShell>
  );
}
