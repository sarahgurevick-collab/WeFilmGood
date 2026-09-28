import "server-only";

/**
 * Le bouton « Continuer avec Google » ne s'affiche que si Supabase a bien
 * reçu la clé Google (GOOGLE_ENABLED dans /srv/supabase/.env). On le
 * demande à Supabase lui-même : rien à redéployer le jour où la clé arrive.
 */
export async function googleDisponible(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !cle) return false;
  try {
    const reponse = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: cle },
      next: { revalidate: 300 },
    });
    if (!reponse.ok) return false;
    const reglages = (await reponse.json()) as { external?: { google?: boolean } };
    return reglages.external?.google === true;
  } catch {
    return false;
  }
}
