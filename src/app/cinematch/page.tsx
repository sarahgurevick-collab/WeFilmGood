import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import QuestionnaireCineMatch from "@/app/profil/gouts/QuestionnaireCineMatch";
import { lireBrouillon, meilleurMatch, type Reponses } from "@/lib/cinematch";
import { calculerCompletion } from "@/app/profil/completion";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ResultatMatch from "./ResultatMatch";
import { TEXTES } from "./textes";

/**
 * CinéMatch (ex-CinéFusion, 08/10) : la page du Menu donne les mêmes
 * vingt questions que le bloc « CinéMatch » du profil (/profil/gouts), et
 * le meilleur match de la personne.
 *
 * Elle est ouverte à tout compte connecté, même un profil réduit à une
 * adresse email (catégorie Greenlighter). Un visiteur sans compte répond
 * d'abord, voit son pourcentage, puis donne son adresse email
 * (/cinematch/resultat) : ses réponses arrivent sur son profil quand il
 * clique sur le lien reçu.
 */
export default async function CinefusionPage({
  searchParams,
}: {
  searchParams: Promise<{ enregistre?: string; bienvenue?: string; erreur?: string }>;
}) {
  const { enregistre, bienvenue, erreur } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Déjà répondu : les réponses sont mémorisées, on ne refait pas le jeu
    // pour voir ce que ça donne (ni pour gonfler son match).
    if (await lireBrouillon()) redirect("/cinematch/resultat");
    return (
      <PageShell title={TEXTES.titre} theme="clair" enTeteAnime connecte={false}>
        <p className={formStyles.hint}>{TEXTES.introVisiteur}</p>
        {erreur === "peu" && <p className={formStyles.error}>{TEXTES.trop_peu}</p>}
        <QuestionnaireCineMatch />
      </PageShell>
    );
  }

  const admin = createAdminClient();

  // Arrivée par le lien reçu après les questions : les réponses données avant
  // d'avoir un compte (dans les métadonnées) passent sur le profil, une fois.
  const enAttente = user.user_metadata?.reponses_cinematch;
  if (admin && typeof enAttente === "string") {
    try {
      const reponses = JSON.parse(enAttente) as Reponses;
      const { data: fiche } = await admin.from("profiles").select("personality_answers").eq("id", user.id).maybeSingle();
      const dejaRepondu = Object.keys((fiche?.personality_answers as object | null) ?? {}).length > 0;
      if (!dejaRepondu && reponses && typeof reponses === "object") {
        await admin
          .from("profiles")
          .update({ personality_answers: reponses, updated_at: new Date().toISOString() })
          .eq("id", user.id);
      }
    } catch {
      // Métadonnées illisibles : on les retire quand même ci-dessous.
    }
    await admin.auth.admin.updateUserById(user.id, { user_metadata: { reponses_cinematch: null } });
  }

  const [{ data: fiche }, { data: adherent }, completion] = await Promise.all([
    supabase.from("profiles").select("personality_answers, category").eq("id", user.id).maybeSingle(),
    supabase.rpc("a_une_adhesion_active", { p_profile_id: user.id }),
    calculerCompletion(supabase, user.id),
  ]);
  const reponses = (fiche?.personality_answers ?? {}) as Reponses;
  const match = await meilleurMatch(reponses, user.id);

  let nom: string | null = null;
  // Le nom : une adhésion ET un profil complet.
  if (match && adherent === true && completion.pourcent === 100 && admin) {
    const { data: leMatch } = await admin
      .from("profiles")
      .select("full_name, first_name")
      .eq("id", match.profileId)
      .maybeSingle();
    nom = leMatch?.full_name ?? leMatch?.first_name ?? null;
  }

  return (
    <PageShell title={TEXTES.titre} theme="clair" enTeteAnime connecte>
      {bienvenue ? (
        <p className={formStyles.hint}>{TEXTES.retourBienvenue}</p>
      ) : (
        enregistre && <p className={formStyles.hint}>{TEXTES.enregistre}</p>
      )}
      {/* Une personne du métier arrivée par CinéMatch n'a pas encore choisi sa
          catégorie : tant que son profil n'est pas complété, elle n'entre pas
          dans les matchs des autres. */}
      {!fiche?.category && (
        <p className={formStyles.hint}>
          {TEXTES.completerProfil} <Link href="/profil/identite">{TEXTES.completerProfilLien}</Link>
        </p>
      )}
      {Object.keys(reponses).length > 0 && (
        <ResultatMatch match={match} adherent={adherent === true} nom={nom} connecte />
      )}
      <QuestionnaireCineMatch userId={user.id} retour="/cinematch" />
    </PageShell>
  );
}
