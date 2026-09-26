import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { signUpReader } from "./actions";

export default async function LecteurInscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; envoye?: string; code?: string }>;
}) {
  const { erreur, envoye, code } = await searchParams;

  if (envoye) {
    return (
      <PageShell eyebrow="Lecteurs" title="Vérifie ta boîte mail" enTeteAnime>
        <p className={formStyles.hint}>
          Un email vient de t&apos;être envoyé. Clique sur le lien qu&apos;il
          contient : ton compte sera activé et tu seras connecté. Rien reçu ?
          Regarde dans les indésirables.
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell eyebrow="Lecteurs" title="Créer un profil lecteur" enTeteAnime>
      <form className={formStyles.form} action={signUpReader}>
        {erreur && <p className={formStyles.error}>{erreur}</p>}

        <label className={formStyles.field}>
          <span>Nom complet</span>
          <input type="text" name="full_name" required autoComplete="name" />
        </label>
        <label className={formStyles.field}>
          <span>Email</span>
          <input type="email" name="email" required autoComplete="email" />
        </label>
        <label className={formStyles.field}>
          <span>Code secret</span>
          <input
            type="text"
            name="code"
            required
            defaultValue={code ?? ""}
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        <button type="submit" className={formStyles.submitWide}>
          Créer mon profil
        </button>
      </form>
    </PageShell>
  );
}
