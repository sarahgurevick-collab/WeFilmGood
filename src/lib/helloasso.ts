import "server-only";

/**
 * Le lien avec HelloAsso, la plateforme de paiement de l'association.
 *
 * Deux comptes : le compte de test (helloasso-sandbox.com, faux argent,
 * fausses cartes) et le vrai. HELLOASSO_MODE choisit lequel : « sandbox »
 * tant que les essais ne sont pas concluants, puis « production ».
 *
 * On ne fait jamais confiance à ce qu'un navigateur ou une notification
 * affirme : un paiement n'est tenu pour réussi qu'après avoir été relu
 * directement chez HelloAsso (lireIntention).
 */
export type ModeHelloAsso = "sandbox" | "production";

export function modeHelloAsso(): ModeHelloAsso {
  return process.env.HELLOASSO_MODE === "production" ? "production" : "sandbox";
}

function configuration() {
  const test = modeHelloAsso() === "sandbox";
  const clientId = test ? process.env.HELLOASSO_SANDBOX_CLIENT_ID : process.env.HELLOASSO_CLIENT_ID;
  const secret = test ? process.env.HELLOASSO_SANDBOX_CLIENT_SECRET : process.env.HELLOASSO_CLIENT_SECRET;
  const slug = test
    ? process.env.HELLOASSO_SANDBOX_ORGANIZATION_SLUG
    : process.env.HELLOASSO_ORGANIZATION_SLUG;
  if (!clientId || !secret || !slug) {
    throw new Error(`HelloAsso (${test ? "test" : "production"}) : clés manquantes`);
  }
  return {
    base: test ? "https://api.helloasso-sandbox.com" : "https://api.helloasso.com",
    clientId,
    secret,
    slug,
  };
}

// Le jeton d'accès vaut une demi-heure : on le garde en mémoire.
let jeton: { valeur: string; expire: number; mode: ModeHelloAsso } | null = null;

async function jetonAcces() {
  const mode = modeHelloAsso();
  if (jeton && jeton.mode === mode && jeton.expire > Date.now() + 60_000) return jeton.valeur;

  const { base, clientId, secret } = configuration();
  const reponse = await fetch(`${base}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: secret,
    }),
    cache: "no-store",
  });
  if (!reponse.ok) throw new Error(`HelloAsso : jeton refusé (${reponse.status})`);
  const d = (await reponse.json()) as { access_token: string; expires_in: number };
  jeton = { valeur: d.access_token, expire: Date.now() + d.expires_in * 1000, mode };
  return jeton.valeur;
}

async function appel<T>(chemin: string, init?: RequestInit): Promise<T> {
  const { base } = configuration();
  const reponse = await fetch(`${base}${chemin}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${await jetonAcces()}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  if (!reponse.ok) {
    throw new Error(`HelloAsso ${chemin} : ${reponse.status} ${await reponse.text()}`);
  }
  return (await reponse.json()) as T;
}

/** Crée une demande de paiement ; renvoie son identifiant et la page de paiement. */
export async function creerIntention(p: {
  montantCentimes: number;
  libelle: string;
  retour: string;
  erreur: string;
  annulation: string;
  payeur: { email: string; prenom?: string | null; nom?: string | null };
  metadata: Record<string, string>;
}) {
  const { slug } = configuration();
  const demande = (avecNom: boolean) =>
    appel<{ id: number; redirectUrl: string }>(`/v5/organizations/${slug}/checkout-intents`, {
      method: "POST",
      body: JSON.stringify({
        totalAmount: p.montantCentimes,
        initialAmount: p.montantCentimes,
        itemName: p.libelle.slice(0, 250),
        backUrl: p.annulation,
        errorUrl: p.erreur,
        returnUrl: p.retour,
        containsDonation: false,
        payer: {
          email: p.payeur.email,
          ...(avecNom && p.payeur.prenom ? { firstName: p.payeur.prenom } : {}),
          ...(avecNom && p.payeur.nom ? { lastName: p.payeur.nom } : {}),
        },
        metadata: p.metadata,
      }),
    });
  // HelloAsso refuse certains noms (sans voyelle, avec des chiffres…) :
  // dans ce cas on redemande sans le nom, que le payeur saisira lui-même
  // sur la page de paiement.
  try {
    return await demande(true);
  } catch (e) {
    if (!(p.payeur.prenom || p.payeur.nom) || !String(e).includes(" 400 ")) throw e;
    return demande(false);
  }
}

export type Intention = {
  id: number;
  metadata?: Record<string, string>;
  order?: {
    id: number;
    payments?: { id: number; amount: number; state: string }[];
  };
};

/** Relit une demande de paiement chez HelloAsso. */
export async function lireIntention(id: string | number) {
  const { slug } = configuration();
  return appel<Intention>(`/v5/organizations/${slug}/checkout-intents/${id}`);
}

/** Le montant réellement encaissé (en centimes), 0 si rien n'est payé. */
export function montantPaye(i: Intention) {
  return (i.order?.payments ?? [])
    .filter((p) => p.state === "Authorized" || p.state === "Processed")
    .reduce((n, p) => n + p.amount, 0);
}
