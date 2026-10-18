import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import NavAdmin from "../NavAdmin";
import styles from "../portraits/portraits.module.css";
import { ecarterLogo, retirerLogo, validerLogo } from "./actions";

type Onglet = "a_valider" | "valide" | "ecarte";
type Ligne = {
  profile_id: string;
  domaine: string;
  page_source: string | null;
  url_logo: string | null;
  statut: Onglet;
  note: string | null;
  profiles: { full_name: string | null; avatar_url: string | null; legacy_id: string | null } | null;
};

/**
 * Les logos de société proposés aux producteurs sans photo (18/10/2026,
 * Sarah : « une planche comme pour les personnages, que je peux vérifier dès
 * que j'ai un peu de temps »). Le logo est montré dans un rond, comme il
 * apparaîtra. Rien n'est visible sur le site avant « Valider ».
 */
export default async function LogosPage({ searchParams }: { searchParams: Promise<{ statut?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: admin } = await supabase.rpc("is_admin");
  if (admin !== true) redirect("/");
  const a = createAdminClient();
  if (!a) redirect("/admin");

  const onglet: Onglet = sp.statut === "valide" || sp.statut === "ecarte" ? sp.statut : "a_valider";
  const compter = async (s: Onglet) =>
    (await a.from("logos_producteurs").select("*", { count: "exact", head: true }).eq("statut", s)).count ?? 0;
  const [nAValider, nValides, nEcartes, { data }] = await Promise.all([
    compter("a_valider"),
    compter("valide"),
    compter("ecarte"),
    a
      .from("logos_producteurs")
      .select("profile_id, domaine, page_source, url_logo, statut, note, profiles(full_name, avatar_url, legacy_id)")
      .eq("statut", onglet)
      .order("cree_le", { ascending: false })
      .limit(200)
      .returns<Ligne[]>(),
  ]);
  const lignes = data ?? [];

  // Le nom de la société connu par WFG 1, quand il y en a un.
  const legacy = lignes.map((l) => l.profiles?.legacy_id).filter((x): x is string => !!x);
  const { data: societes } = legacy.length
    ? await a.rpc("societes_wfg1", { p_ids: legacy })
    : { data: [] as { legacy_id: string; societe: string }[] };
  const societeDe = new Map(((societes ?? []) as { legacy_id: string; societe: string }[]).map((s) => [s.legacy_id, s.societe]));

  const onglets: [Onglet, string, number][] = [
    ["a_valider", "À valider", nAValider],
    ["valide", "Validés", nValides],
    ["ecarte", "Écartés", nEcartes],
  ];

  return (
    <PageShell nav="admin" avantTitre={<NavAdmin />} title="Logos des producteurs" theme="clair">
      <div className={styles.onglets}>
        {onglets.map(([cle, libelle, n]) => (
          <Link key={cle} href={`/admin/logos?statut=${cle}`} className={onglet === cle ? styles.ongletActif : styles.onglet}>
            {libelle} ({n})
          </Link>
        ))}
      </div>

      {lignes.length === 0 ? (
        <p className={formStyles.hint}>Rien ici pour l&apos;instant.</p>
      ) : (
        <ul className={styles.grille}>
          {lignes.map((l) => {
            const societe = l.profiles?.legacy_id ? societeDe.get(l.profiles.legacy_id) : undefined;
            return (
              <li key={l.profile_id} className={styles.carte}>
                {l.url_logo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={l.url_logo}
                    alt=""
                    style={{ width: 140, height: 140, borderRadius: "50%", objectFit: "cover", alignSelf: "center", border: "1px solid #ddd" }}
                  />
                )}
                <h2 className={styles.nom}>
                  <Link href={`/membres/${l.profile_id}`} target="_blank" rel="noopener noreferrer">
                    {l.profiles?.full_name || "Producteur sans nom"}
                  </Link>
                </h2>
                {societe && <p className={styles.projet}>{societe}</p>}
                {/* Site deviné d'après le nom de la société (18/10) : à vérifier de plus près. */}
                {l.note === "site deviné d'après le nom de la société" && (
                  <p className={styles.note}>Site deviné d&apos;après le nom de la société : vérifiez que c&apos;est bien la sienne.</p>
                )}
                {l.note === "logo d'un collègue de la même société" && (
                  <p className={styles.lot}>Même logo qu&apos;un collègue de sa société</p>
                )}
                {onglet === "ecarte" && l.note?.startsWith("Écarté au contrôle : ") && (
                  <p className={styles.lot}>{l.note.replace("Écarté au contrôle : ", "Écarté : ")}</p>
                )}
                <p className={styles.lot}>
                  <a href={l.page_source ?? `https://${l.domaine}`} target="_blank" rel="noopener noreferrer">
                    {l.domaine}
                  </a>
                </p>
                <div className={styles.actions}>
                  {onglet === "a_valider" && (
                    <>
                      <form action={validerLogo}>
                        <input type="hidden" name="profile_id" value={l.profile_id} />
                        <button type="submit" className={styles.valider}>
                          Valider
                        </button>
                      </form>
                      <form action={ecarterLogo}>
                        <input type="hidden" name="profile_id" value={l.profile_id} />
                        <button type="submit" className={styles.retirer}>
                          Écarter
                        </button>
                      </form>
                    </>
                  )}
                  {onglet === "valide" && (
                    <form action={retirerLogo}>
                      <input type="hidden" name="profile_id" value={l.profile_id} />
                      <button type="submit" className={styles.retirer}>
                        Retirer
                      </button>
                    </form>
                  )}
                  {onglet === "ecarte" && (
                    <form action={validerLogo}>
                      <input type="hidden" name="profile_id" value={l.profile_id} />
                      <button type="submit" className={styles.valider}>
                        Valider quand même
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
