import Link from "next/link";
import { dateArchive, type ArchiveLecture } from "@/lib/archives-lecture";

/**
 * Une fiche de lecture des archives de la Maison (31/10/2026), repliée :
 * on l'ouvre pour lire le texte, le mot du lecteur et le document
 * d'origine. Administration seulement.
 */
export default function FicheArchivee({ f, projet }: { f: ArchiveLecture; projet?: string | null }) {
  const reperes = [f.appel, f.lecteur ? `lue par ${f.lecteur}` : null, dateArchive(f.recue_le)].filter(Boolean).join(" · ");
  return (
    <details style={{ borderTop: "1px solid var(--border, #ddd)", padding: "10px 0" }}>
      <summary style={{ cursor: "pointer" }}>
        <strong>{f.titre}</strong>
        {f.auteurs ? <> — {f.auteurs}</> : null}
        <span style={{ display: "block", fontSize: "0.85em", opacity: 0.75 }}>{reperes}</span>
      </summary>
      <div style={{ marginTop: 10 }}>
        {projet !== undefined && (
          <p style={{ margin: "0 0 8px" }}>
            {f.project_id ? (
              <Link href={`/projet/${f.project_id}`}>Fiche projet : {projet ?? f.titre}</Link>
            ) : (
              <em>Projet non retrouvé dans WFG 2</em>
            )}
          </p>
        )}
        {f.lien && (
          <p style={{ margin: "0 0 8px" }}>
            <a href={f.lien} target="_blank" rel="noreferrer">
              Document d&apos;origine{f.fichier_nom ? ` (${f.fichier_nom})` : ""}
            </a>
          </p>
        )}
        {f.texte && (
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: "0.92em", margin: 0 }}>{f.texte}</pre>
        )}
        {f.message_lecteur && (
          <>
            <p style={{ margin: "12px 0 4px" }}>
              <strong>Message du lecteur avec la fiche</strong>
            </p>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: "0.92em", margin: 0, opacity: 0.85 }}>
              {f.message_lecteur}
            </pre>
          </>
        )}
      </div>
    </details>
  );
}
