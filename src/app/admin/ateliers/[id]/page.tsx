import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import NavAdmin from "../../NavAdmin";
import formStyles from "@/components/form.module.css";
import adminStyles from "../../admin.module.css";
import { createClient } from "@/lib/supabase/server";
import {
  CHAMPS_ATELIER,
  dateAtelier,
  enregistrementsDeLaSalle,
  isoVersParis,
  type Atelier,
} from "@/lib/ateliers";
import {
  ajouterIntervenant,
  choisirRediffusion,
  envoyerRediffusion,
  inviterIntervenants,
  modifierAtelier,
  retirerIntervenant,
  supprimerAtelier,
} from "../actions";

const ERREURS: Record<string, string> = {
  champs: "Il faut au moins un titre et une date.",
  intervenant: "Il faut un nom et une adresse email valide.",
  complet: "Il y a déjà 5 intervenants : c'est le maximum.",
  rediffusion: "Choisissez d'abord l'enregistrement à envoyer.",
};

function taille(octets: number) {
  return octets > 1e9 ? `${(octets / 1e9).toFixed(1)} Go` : `${Math.round(octets / 1e6)} Mo`;
}

export default async function AtelierAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");

  const { data: atelier } = await supabase
    .from("ateliers")
    .select(CHAMPS_ATELIER)
    .eq("id", id)
    .maybeSingle<Atelier>();
  if (!atelier) notFound();

  const [{ data: intervenants }, { count: presents }, { count: questions }, enregistrements] =
    await Promise.all([
      supabase
        .from("atelier_intervenants")
        .select("id, nom, email, invite_le")
        .eq("atelier_id", id)
        .order("created_at"),
      supabase
        .from("atelier_presences")
        .select("profile_id", { count: "exact", head: true })
        .eq("atelier_id", id),
      supabase
        .from("atelier_questions")
        .select("id", { count: "exact", head: true })
        .eq("atelier_id", id),
      enregistrementsDeLaSalle(atelier.salle),
    ]);

  const nonInvites = (intervenants ?? []).filter((i) => !i.invite_le).length;

  return (
    <PageShell nav="admin" avantTitre={<NavAdmin />} title={atelier.titre} theme="clair">
      <p className={formStyles.hint}>
        <Link href="/admin/ateliers">← Tous les ateliers</Link> · {dateAtelier(atelier.debut)} ·{" "}
        {atelier.duree_minutes} min
      </p>

      {sp.erreur && ERREURS[sp.erreur] && <p className={formStyles.error}>{ERREURS[sp.erreur]}</p>}
      {sp.enregistre && <p className={formStyles.hint}>✓ Modifications enregistrées.</p>}
      {sp.invites && <p className={formStyles.hint}>✓ {sp.invites} invitation(s) envoyée(s).</p>}
      {sp.rediffusion && (
        <p className={formStyles.hint}>✓ Rediffusion envoyée à {sp.rediffusion} personne(s).</p>
      )}

      <p style={{ margin: "24px 0" }}>
        <Link href={`/ateliers/${atelier.salle}`} className={formStyles.submit}>
          Ouvrir la régie
        </Link>
      </p>
      <p className={formStyles.hint}>
        Lien à donner au public (membres connectés) :{" "}
        <code>https://app.wefilmgood.com/ateliers/{atelier.salle}</code>
        <br />
        {presents ?? 0} membre(s) venu(s) · {questions ?? 0} question(s) posée(s)
      </p>

      <h2 className={adminStyles.subhead}>Intervenants ({(intervenants ?? []).length} / 5)</h2>
      <table className={adminStyles.table}>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Email</th>
            <th>Invitation</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {(intervenants ?? []).length === 0 && (
            <tr>
              <td colSpan={4} style={{ color: "var(--dim)" }}>
                Aucun intervenant pour l&apos;instant.
              </td>
            </tr>
          )}
          {(intervenants ?? []).map((i) => (
            <tr key={i.id}>
              <td>{i.nom}</td>
              <td>{i.email}</td>
              <td>
                {i.invite_le ? `Envoyée le ${new Date(i.invite_le).toLocaleDateString("fr-FR")}` : "Pas encore"}
              </td>
              <td style={{ whiteSpace: "nowrap" }}>
                <form action={inviterIntervenants} style={{ display: "inline" }}>
                  <input type="hidden" name="atelier_id" value={id} />
                  <input type="hidden" name="id" value={i.id} />
                  <button type="submit" className={adminStyles.linkButton}>
                    {i.invite_le ? "Renvoyer" : "Inviter"}
                  </button>
                </form>{" "}
                <form action={retirerIntervenant} style={{ display: "inline" }}>
                  <input type="hidden" name="atelier_id" value={id} />
                  <input type="hidden" name="id" value={i.id} />
                  <button type="submit" className={adminStyles.linkButton}>
                    Retirer
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {(intervenants ?? []).length < 5 && (
        <form className={adminStyles.inlineForm} action={ajouterIntervenant} style={{ marginTop: 16 }}>
          <input type="hidden" name="atelier_id" value={id} />
          <input type="text" name="nom" placeholder="Prénom Nom" required />
          <input type="email" name="email" placeholder="adresse@email.fr" required />
          <button type="submit" className={adminStyles.linkButton}>
            Ajouter
          </button>
        </form>
      )}
      {nonInvites > 0 && (
        <form action={inviterIntervenants} style={{ marginTop: 16 }}>
          <input type="hidden" name="atelier_id" value={id} />
          <button type="submit" className={formStyles.submit}>
            Envoyer les invitations ({nonInvites})
          </button>
        </form>
      )}

      <h2 className={adminStyles.subhead}>Enregistrement et rediffusion</h2>
      {enregistrements.length === 0 ? (
        <p className={formStyles.hint}>
          Aucun enregistrement pour cette salle. Pendant l&apos;atelier, lancez-le depuis la régie
          (bouton « Démarrer l&apos;enregistrement ») ; le fichier apparaît ici quelques minutes
          après l&apos;arrêt.
        </p>
      ) : (
        <form action={choisirRediffusion} className={formStyles.form}>
          <input type="hidden" name="atelier_id" value={id} />
          {enregistrements.map((e) => (
            <label key={e.fichier} className={formStyles.checkline}>
              <input
                type="radio"
                name="fichier"
                value={e.fichier}
                defaultChecked={atelier.rediffusion_fichier === e.fichier}
              />
              <span>
                Enregistrement du {e.date.toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} ·{" "}
                {taille(e.taille)}
              </span>
            </label>
          ))}
          <button type="submit" className={adminStyles.linkButton}>
            Choisir cet enregistrement
          </button>
        </form>
      )}
      {atelier.rediffusion_fichier && (
        <>
          <p className={formStyles.hint} style={{ marginTop: 16 }}>
            Rediffusion choisie. Vérifiez-la sur{" "}
            <Link href={`/ateliers/${atelier.salle}`}>la page de l&apos;atelier</Link> avant de
            l&apos;envoyer.
            {atelier.rediffusion_envoyee_le &&
              ` Déjà envoyée le ${new Date(atelier.rediffusion_envoyee_le).toLocaleDateString("fr-FR")}.`}
          </p>
          <form action={envoyerRediffusion}>
            <input type="hidden" name="atelier_id" value={id} />
            <button type="submit" className={formStyles.submit}>
              {atelier.rediffusion_envoyee_le ? "Renvoyer" : "Envoyer"} la rediffusion aux{" "}
              {presents ?? 0} membre(s) venu(s) et aux intervenants
            </button>
          </form>
        </>
      )}

      <h2 className={adminStyles.subhead}>Modifier l&apos;atelier</h2>
      <form className={formStyles.form} action={modifierAtelier}>
        <input type="hidden" name="id" value={id} />
        <label className={formStyles.field}>
          <span>Titre</span>
          <input type="text" name="titre" required defaultValue={atelier.titre} />
        </label>
        <label className={formStyles.field}>
          <span>Présentation</span>
          <textarea name="description" rows={3} defaultValue={atelier.description ?? ""} />
        </label>
        <label className={formStyles.field}>
          <span>Date et heure (heure de Paris)</span>
          <input type="datetime-local" name="debut" required defaultValue={isoVersParis(atelier.debut)} />
        </label>
        <label className={formStyles.field}>
          <span>Durée prévue (minutes)</span>
          <input
            type="number"
            name="duree_minutes"
            min={15}
            max={480}
            step={15}
            defaultValue={atelier.duree_minutes}
          />
        </label>
        <button type="submit" className={formStyles.submit}>
          Enregistrer
        </button>
      </form>

      <form action={supprimerAtelier} style={{ marginTop: 40 }}>
        <input type="hidden" name="id" value={id} />
        <label className={formStyles.checkline}>
          <input type="checkbox" required /> <span>Je veux vraiment supprimer cet atelier</span>
        </label>
        <button type="submit" className={adminStyles.linkButton}>
          Supprimer cet atelier (et ses questions)
        </button>
      </form>
    </PageShell>
  );
}
