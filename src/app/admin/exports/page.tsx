import { readdir, stat } from "node:fs/promises";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createAdminClient } from "@/lib/supabase/admin";
import { derniereSauvegarde } from "@/lib/sauvegarde";
import { createClient } from "@/lib/supabase/server";
import NavAdmin from "../NavAdmin";

/** Les fichiers préparés pour l'administration, à télécharger d'un clic. */
export default async function ExportsPage() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");

  let fichiers: { nom: string; taille: number; date: Date }[] = [];
  try {
    const noms = await readdir("/home/wfg/exports");
    fichiers = await Promise.all(
      noms.map(async (nom) => {
        const s = await stat(`/home/wfg/exports/${nom}`);
        return { nom, taille: s.size, date: s.mtime };
      }),
    );
  } catch {
    fichiers = [];
  }
  fichiers.sort((a, b) => b.date.getTime() - a.date.getTime());

  // La sauvegarde complète du site, à copier chaque semaine sur le disque de Sarah (18/10).
  const sauvegarde = await derniereSauvegarde();
  const admin = createAdminClient();
  const { data: dernier } = admin
    ? await admin.from("telechargements_sauvegarde").select("le").order("le", { ascending: false }).limit(1).maybeSingle<{ le: string }>()
    : { data: null };
  const joursDepuis = dernier ? Math.floor((Date.now() - new Date(dernier.le).getTime()) / 86_400_000) : null;
  const enRetard = joursDepuis === null || joursDepuis >= 7;
  const dateFr = (d: Date) => d.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "long", timeStyle: "short" });

  return (
    <PageShell nav="admin" avantTitre={<NavAdmin />} title="Fichiers à télécharger" theme="clair">
      <section style={{ border: `2px solid ${enRetard ? "#DA2C25" : "#ddd"}`, borderRadius: 14, padding: "16px 18px", marginBottom: 32 }}>
        <h2 style={{ margin: "0 0 6px", fontSize: 18 }}>Sauvegarde complète du site</h2>
        {sauvegarde ? (
          <>
            <p className={formStyles.hint} style={{ margin: "0 0 12px" }}>
              Prise le {dateFr(sauvegarde.date)} · {(sauvegarde.taille / 1e9).toFixed(1).replace(".", ",")} Go. À enregistrer
              chaque semaine sur votre disque, chiffré, en attendant une sauvegarde hors du serveur.
            </p>
            <a href="/admin/sauvegarde" download className={formStyles.submit} style={{ display: "inline-block" }}>
              Télécharger la dernière sauvegarde
            </a>
            <p className={formStyles.hint} style={{ margin: "12px 0 0", color: enRetard ? "#b3261e" : undefined }}>
              {dernier
                ? `Dernier téléchargement : ${dateFr(new Date(dernier.le))}${enRetard ? " — il y a plus d'une semaine" : ""}.`
                : "Jamais téléchargée pour l'instant."}
            </p>
          </>
        ) : (
          <p className={formStyles.hint}>Aucune sauvegarde trouvée sur le serveur : prévenez Claude.</p>
        )}
      </section>

      {fichiers.length === 0 ? (
        <p className={formStyles.hint}>Aucun fichier pour l&apos;instant.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          {fichiers.map((f) => (
            <li key={f.nom}>
              <a href={`/admin/exports/${encodeURIComponent(f.nom)}`} download className={formStyles.submit} style={{ display: "inline-block" }}>
                {f.nom}
              </a>
              <span className={formStyles.hint} style={{ marginLeft: 12 }}>
                {Math.max(1, Math.round(f.taille / 1024))} Ko · {f.date.toLocaleDateString("fr-FR")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
