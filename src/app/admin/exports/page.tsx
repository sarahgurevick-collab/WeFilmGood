import { readdir, stat } from "node:fs/promises";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
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

  return (
    <PageShell nav="admin" avantTitre={<NavAdmin />} title="Fichiers à télécharger" theme="clair">
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
