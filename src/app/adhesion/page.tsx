import PageShell from "@/components/PageShell";
import SelecteurAdhesion from "@/components/SelecteurAdhesion";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";

export default async function AdhesionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <PageShell eyebrow="WeFilmGood" title="Adhésion" enTeteAnime connecte={!!user}>
      <SelecteurAdhesion
        contenus={[
          <ul key="0" className={styles.avantages}>
            <li>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>
                La Pitchothèque et le Finder — pour savoir combien de projets
                répondent à vos envies.
              </span>
            </li>
            <li>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span>1 projet / moi (random)</span>
            </li>
          </ul>,
        ]}
      />
    </PageShell>
  );
}
