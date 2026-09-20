import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Client à privilèges, réservé au serveur.
 *
 * Il sert à une seule chose aujourd'hui : retrouver l'adresse d'un
 * membre pour le prévenir qu'il a reçu un message. Cette adresse ne
 * quitte jamais le serveur — elle part chez Brevo, jamais dans le
 * navigateur de l'expéditeur, qui ne doit pas pouvoir la collecter.
 *
 * La clé n'est pas préfixée NEXT_PUBLIC : Next.js refuse de l'inclure
 * dans le code envoyé au navigateur. L'import "server-only" ci-dessus
 * fait échouer la compilation si ce fichier est atteint depuis un
 * composant client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !cle) return null;

  return createClient(url, cle, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** L'adresse d'un membre, pour lui envoyer une notification. */
export async function emailDuMembre(profileId: string): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data, error } = await admin.auth.admin.getUserById(profileId);
  if (error) return null;
  return data.user?.email ?? null;
}
