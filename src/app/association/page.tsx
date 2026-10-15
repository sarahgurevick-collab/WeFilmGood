import Link from "next/link";
import Compteur from "@/components/Compteur";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import {
  CHIFFRES,
  CONTACT,
  FILMS,
  HISTOIRE,
  PHILOSOPHIE,
  PRESSE,
  PRODUCTEURS,
  RENCONTRES,
  WALL_OF_FAME,
} from "@/data/association";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";

export const metadata = {
  title: "Maison des Scénaristes — La maison de tous les auteurs",
  description:
    "Depuis 2012, la Maison des Scénaristes place le scénario au cœur du processus artistique et financier de tous les films.",
};

/**
 * La page de l'association dans WFG 2 (15/10/2026, décision de Sarah) :
 * le site maisondesscenaristes.org repris tel quel, textes et photos, en
 * bandes courtes ; chaque sujet déjà développé sur WeFilmGood (témoignages,
 * masterclass, appels à projets, adhésion) renvoie vers sa page.
 */
export default async function AssociationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <PageShell
      eyebrow="Maison des Scénaristes"
      title="La maison de tous les auteurs"
      theme="clair"
      enTeteAnime
      connecte={!!user}
    >
      <div className={styles.page}>
        <section className={styles.bloc}>
          <h2 className={styles.titre}>Philosophie</h2>
          {PHILOSOPHIE.map((p) => (
            <p key={p} className={styles.texte}>
              {p}
            </p>
          ))}
          <p className={styles.texte}>
            Retrouvez-nous « online » sur la plateforme{" "}
            <Link href="/" className={styles.marque}>
              <span className={styles.rouge}>We</span>Film<span className={styles.rouge}>Good</span>
            </Link>
            , pour que les scénaristes les moins connectés et les plus isolés puissent bénéficier de notre
            accompagnement.
          </p>
          <p className={`${styles.texte} ${styles.devise}`}>Travaillons ensemble pour voir nos scripts sur les écrans !</p>
        </section>

        <section className={styles.bloc}>
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

        <section className={styles.bloc}>
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

        <section className={styles.bloc}>
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

        <section className={styles.bloc}>
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

        <section className={styles.bloc}>
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

        <section className={styles.bloc}>
          <h2 className={styles.titre}>Les Masterclass de la Maison des Scénaristes</h2>
          <p className={styles.texte}>À consommer sans modération !</p>
          <Link href="/masterclass" className={`${formStyles.submit} ${styles.bouton}`}>
            Masterclass
          </Link>
        </section>

        <section className={styles.bloc}>
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

        <section className={styles.bloc}>
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

        <section className={styles.bloc}>
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
