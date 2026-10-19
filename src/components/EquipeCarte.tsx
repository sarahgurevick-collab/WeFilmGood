import Link from "next/link";
import type { EquipeCarte as Donnees } from "@/app/pitchotheque/equipe-carte";
import styles from "./PersonnagesCarte.module.css";

const METIERS_MONTRES = 3;

/**
 * Sous la carte d'un projet (19/10/2026, Sarah) : les talents déjà
 * rattachés, avant de dépenser un crédit. Les portraits, puis les métiers
 * (« Réalisateur · Compositeur +1 »). Rien si personne n'est rattaché.
 * Même ligne que les personnages, dont elle reprend le style.
 */
export default function EquipeCarte({ projetId, equipe }: { projetId: string; equipe: Donnees | null | undefined }) {
  if (!equipe || equipe.total === 0) return null;
  const montres = equipe.metiers.slice(0, METIERS_MONTRES);
  const reste = equipe.total - montres.length;
  const texte = montres.length
    ? `${montres.join(" · ")}${reste > 0 ? ` +${reste}` : ""}`
    : `${equipe.total} talent${equipe.total > 1 ? "s" : ""}`;
  return (
    <Link href={`/projet/${projetId}`} className={styles.ligne} title="Les talents déjà rattachés à ce projet">
      <span className={styles.portraits}>
        {equipe.portraits.map((p, i) => (
          <span key={`${p.id}-${i}`} className={`${styles.portrait} ${p.src ? "" : styles.lettre}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.src ? <img src={p.src} alt="" loading="lazy" /> : p.lettre}
          </span>
        ))}
      </span>
      <span className={styles.nombre}>{texte}</span>
    </Link>
  );
}
