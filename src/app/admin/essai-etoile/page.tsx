import type { CSSProperties, ReactNode } from "react";
import { redirect } from "next/navigation";
import EtoileSpark from "@/components/EtoileSpark";
import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import NavAdmin from "../NavAdmin";

export const metadata = { title: "Essai : l'étoile des spectateurs", robots: { index: false } };

const rangee: CSSProperties = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 28, margin: "14px 0 6px" };
const legende: CSSProperties = { margin: "0 0 4px", fontSize: 15, opacity: 0.75 };

function Bloc({ titre, sombre = false, children }: { titre: string; sombre?: boolean; children: ReactNode }) {
  return (
    <section
      style={{
        background: sombre ? "#0a0a0a" : "#fff",
        color: sombre ? "#fff" : "#1a1a1a",
        border: "1px solid #ddd",
        borderRadius: 14,
        padding: "18px 22px",
        marginBottom: 22,
      }}
    >
      <h2 style={{ margin: 0, fontSize: 18 }}>{titre}</h2>
      {children}
    </section>
  );
}

/**
 * Page d'essai, visible de l'administration seulement et absente des menus :
 * l'étoile des spectateurs (piste « étoiles et comètes », en réflexion le
 * 12/11). Rien n'est enregistré, les nombres sont des exemples.
 */
export default async function EssaiEtoilePage() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");

  return (
    <PageShell nav="admin" avantTitre={<NavAdmin />} title="Essai : l'étoile des spectateurs" theme="clair">
      <p style={{ margin: "0 0 22px" }}>
        Page d&apos;essai, visible de vous seule. Les nombres sont des exemples, rien n&apos;est enregistré.
      </p>

      <Bloc titre="1. Donner une étoile : cliquez">
        <p style={legende}>Au repos l&apos;étoile ne bouge pas. Chaque clic lance la vague et ajoute un.</p>
        <div style={rangee}>
          <EtoileSpark nombre={0} taille={120} cliquable />
          <EtoileSpark nombre={47} taille={120} cliquable />
          <EtoileSpark nombre={998} taille={120} cliquable />
        </div>
      </Bloc>

      <Bloc titre="2. La même sur fond noir" sombre>
        <div style={rangee}>
          <EtoileSpark nombre={12} taille={120} cliquable />
          <EtoileSpark nombre={128} taille={120} cliquable />
        </div>
      </Bloc>

      <Bloc titre="3. Les tailles">
        <p style={legende}>De la plus petite (sous une carte) à la plus grande (sur la fiche).</p>
        <div style={rangee}>
          <EtoileSpark nombre={7} taille={40} />
          <EtoileSpark nombre={128} taille={40} />
          <EtoileSpark nombre={7} taille={56} />
          <EtoileSpark nombre={128} taille={56} />
          <EtoileSpark nombre={1204} taille={56} />
          <EtoileSpark nombre={128} taille={88} />
          <EtoileSpark nombre={1204} taille={88} />
          <EtoileSpark nombre={128} taille={160} />
        </div>
      </Bloc>

      <Bloc titre="4. Chez le talent : de nouvelles étoiles sont arrivées">
        <p style={legende}>L&apos;étoile scintille doucement tant qu&apos;il n&apos;est pas venu voir.</p>
        <div style={rangee}>
          <EtoileSpark nombre={47} taille={120} scintille />
          <EtoileSpark nombre={47} taille={56} scintille />
        </div>
      </Bloc>
    </PageShell>
  );
}
