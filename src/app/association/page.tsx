import Link from "next/link";
import Compteur from "@/components/Compteur";
import FeuArtificeAuPassage from "@/components/FeuArtificeAuPassage";
import AscenseurMaison from "./AscenseurMaison";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import {
  CHIFFRES,
  CONTACT,
  ETAGES,
  FILMS,
  HISTOIRE,
  PRESSE,
  PRODUCTEURS,
  RENCONTRES,
  WALL_OF_FAME,
} from "@/data/association";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";

export const metadata = {
  title: "La Maison des Scénaristes a 15 ans : 2012 - 2027",
  description:
    "Depuis 2012, la Maison des Scénaristes place le scénario au cœur du processus artistique et financier de tous les films.",
};

/**
 * La page de l'association dans WFG 2 (15/10/2026, décision de Sarah) :
 * le site maisondesscenaristes.org repris tel quel, textes et photos, en
 * bandes courtes ; chaque sujet déjà développé sur WeFilmGood (témoignages,
 * masterclass, appels à projets, adhésion) renvoie vers sa page.
 *
 * 16/10/2026 : la page passe dans l'univers du site — fond noir — et
 * s'ouvre sur l'ascenseur de la Maison : chaque section est un étage
 * (ETAGES), les portes s'ouvrent sur sa photo, « Entrer » y descend.
 */
export default async function AssociationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <PageShell
      title={
        <FeuArtificeAuPassage>
          La Maison des Scénaristes a 15 ans : 2012 - 2027
        </FeuArtificeAuPassage>
      }
      enTeteAnime
      connecte={!!user}
    >
      <AscenseurMaison etages={ETAGES} />
      <div className={styles.page}>
        <section id="etage-chiffres" className={styles.bloc}>
          <h2 className={styles.titre}>Nos stats depuis notre naissance en 2012</h2>
          <div className={styles.chiffres}>
            {CHIFFRES.map((c) => (
              <Compteur key={c.label} valeur={c.valeur} prefixe={c.prefixe} label={c.label} taille="grand" />
            ))}
          </div>
          <p className={styles.texte}>
            Ils témoignent{" "}
            <Link href="/temoignages" className={styles.lien}>
              ☛ ici
            </Link>
          </p>
        </section>

        <section id="etage-histoire" className={styles.bloc}>
          <h2 className={styles.titre}>Notre Histoire</h2>
          <ol className={styles.frise}>
            {HISTOIRE.map((h) => (
              <li key={h.date} className={styles.etape}>
                <span className={styles.date}>{h.date}</span>
                <span>{h.texte}</span>
              </li>
            ))}
          </ol>
        </section>

        <section id="etage-films" className={styles.bloc}>
          <h2 className={styles.titre}>Projets sélectionnés 2012-2026</h2>
          <ul className={styles.films}>
            {FILMS.map((f) => (
              <li key={f.titre} className={styles.film}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.image} alt="" className={styles.filmImage} loading="lazy" />
                <div className={styles.filmTexte}>
                  <h3 className={styles.filmTitre}>« {f.titre} »</h3>
                  <p className={styles.filmAuteurs}>{f.auteurs}</p>
                  <p>{f.selection}</p>
                  {f.distinction && <p className={styles.distinction}>{f.distinction}</p>}
                  {f.lien && (
                    <a href={f.lien.href} target="_blank" rel="noopener noreferrer" className={styles.lien}>
                      {f.lien.libelle}
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section id="etage-wall-of-fame" className={styles.bloc}>
          <h2 className={styles.titre}>Wall of Fame</h2>
          <ul className={styles.wall}>
            {WALL_OF_FAME.map((w) => (
              <li key={w.titre}>
                <strong>{w.titre}</strong>
                {w.mention && <span className={styles.mention}> — {w.mention}</span>}
              </li>
            ))}
          </ul>
        </section>

        <section id="etage-rencontres" className={styles.bloc}>
          <h2 className={styles.titre}>Rencontres Auteurs-Producteurs à la Maison des Scénaristes</h2>
          <p className={styles.texte}>
            Festival de Cannes, Festival de Clermont-Ferrand, Festival Séries Mania et 360 Film Festival
          </p>
          <p className={formStyles.hint}>
            <a href={CONTACT.photographe} target="_blank" rel="noopener noreferrer" className={styles.lien}>
              Photos ©MelleMary
            </a>
          </p>
          <ul className={styles.photos}>
            {RENCONTRES.map((r) => (
              <li key={r.image} className={styles.photo}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.image} alt={r.legende} loading="lazy" />
                <figcaption className={styles.legende}>{r.legende}</figcaption>
              </li>
            ))}
          </ul>
        </section>

        <section id="etage-masterclass" className={styles.bloc}>
          <h2 className={styles.titre}>Les Masterclass de la Maison des Scénaristes</h2>
          <p className={styles.texte}>À consommer sans modération !</p>
          <Link href="/masterclass" className={`${formStyles.submit} ${styles.bouton}`}>
            Masterclass
          </Link>
        </section>

        <section id="etage-presse" className={styles.bloc}>
          <h2 className={styles.titre}>Ils parlent de nous...</h2>
          <ul className={styles.presse}>
            {PRESSE.map((p) => (
              <li key={p.nom}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image} alt={p.nom} title={p.nom} loading="lazy" />
              </li>
            ))}
          </ul>
        </section>

        <section id="etage-producteurs" className={styles.bloc}>
          <h2 className={styles.titre}>Les Producteurs qui nous font confiance</h2>
          <ul className={styles.producteurs}>
            {PRODUCTEURS.map((p) => (
              <li key={p.nom}>
                {p.lien ? (
                  <a href={p.lien} target="_blank" rel="noopener noreferrer nofollow">
                    {p.nom}
                  </a>
                ) : (
                  p.nom
                )}
              </li>
            ))}
          </ul>
        </section>

        <section id="etage-contact" className={styles.bloc}>
          <h2 className={styles.titre}>Contact</h2>
          <ul className={styles.contact}>
            <li>
              <a href={`mailto:${CONTACT.email}`} className={styles.lien}>
                {CONTACT.email}
              </a>
            </li>
            <li>
              Producteurs :{" "}
              <a href={CONTACT.calendly} target="_blank" rel="noopener noreferrer" className={styles.lien}>
                prendre rendez-vous
              </a>
            </li>
            <li>
              <Link href="/adhesion" className={styles.lien}>
                Adhésion
              </Link>
            </li>
            <li>
              Suivez nous !{" "}
              <a href={CONTACT.facebook} target="_blank" rel="noopener noreferrer" className={styles.lien}>
                Facebook
              </a>
            </li>
          </ul>
        </section>
      </div>
    </PageShell>
  );
}
