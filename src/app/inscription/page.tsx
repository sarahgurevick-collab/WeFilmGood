import { redirect } from "next/navigation";

/**
 * Depuis le 05/11/2026, une seule entrée (comme chez Vimeo) : /connexion.
 * Les anciens liens « Créer un profil » y mènent, avec leurs paramètres.
 */
export default async function InscriptionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(await searchParams)) {
    if (valeur) params.set(cle, valeur);
  }
  const suite = params.toString();
  redirect(suite ? `/connexion?${suite}` : "/connexion");
}
