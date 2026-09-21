import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";

export default async function CguvPage() {
  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("legal_documents")
    .select("title, content, updated_at")
    .eq("slug", "cguv")
    .maybeSingle();

  return (
    <PageShell
      eyebrow="Mentions légales"
      title={doc?.title ?? "Conditions Générales d'Utilisation et de Vente"}
      theme="clair"
    >
      {doc?.content ? (
        <div style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.7 }}>
          {doc.content}
        </div>
      ) : (
        <p className={formStyles.hint}>
          Le texte des conditions n&apos;a pas encore été rédigé. Un
          administrateur peut le saisir depuis l&apos;espace d&apos;administration.
        </p>
      )}
    </PageShell>
  );
}
