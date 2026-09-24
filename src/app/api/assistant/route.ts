import { CONSIGNES_ASSISTANT } from "@/lib/assistant/connaissances";
import { createClient } from "@/lib/supabase/server";

/**
 * L'assistant des membres : relaie la conversation à MiniMax M3 (par
 * OpenRouter) et renvoie la réponse au fil de l'eau, en texte brut.
 *
 * Ouvert aux membres connectés et aux visiteurs de l'accueil — pas aux
 * lecteurs, qui restent à part. Un plafond quotidien (par membre, ou par
 * adresse IP pour un visiteur) protège la facture.
 */

const MODELE = "minimax/minimax-m3";
const PLAFOND_JOUR = 60;
/** Un visiteur non connecté, compté par adresse IP. */
const PLAFOND_VISITEUR = 20;
const HISTORIQUE = 16;
const LONGUEUR_MAX = 2000;

// Compteur en mémoire, remis à zéro au redémarrage : suffisant comme
// garde-fou, sans table en base.
const compteurs = new Map<string, { jour: string; n: number }>();

type Message = { role: "user" | "assistant"; content: string };

/**
 * Le membre connecté a-t-il droit au tchat ? Sinon, formulaire de contact.
 * Le tchat s'affiche même sans clé OpenRouter : les messages partent alors
 * directement à l'équipe (voir `ia` dans GET).
 */
async function membreAutorise() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const [{ data: lecteur }, { data: isAdmin }, { data: profil }] = await Promise.all([
    supabase
      .from("profile_roles")
      .select("role_slug")
      .eq("profile_id", user.id)
      .eq("role_slug", "lecteur")
      .maybeSingle(),
    supabase.rpc("is_admin"),
    supabase.from("profiles").select("full_name, first_name").eq("id", user.id).maybeSingle(),
  ]);
  if (lecteur && !isAdmin) return null;
  const nom = (profil?.full_name as string | null) ?? null;
  const prenom = (profil?.first_name as string | null)?.trim() || nom?.split(" ")[0] || null;
  return { id: user.id, email: user.email, nom, prenom };
}

export async function GET() {
  const membre = await membreAutorise();
  // Sans assistant, le formulaire de contact a besoin de savoir si la
  // personne est connectée : « pas besoin de créer un profil » ne
  // s'adresse qu'aux visiteurs.
  // Un membre connecté y trouve aussi son nom et son email déjà remplis.
  let visiteur: { connecte: boolean; nom?: string | null; email?: string | null } = {
    connecte: !!membre,
  };
  if (!membre) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profil } = await supabase
        .from("profiles")
        .select("full_name, first_name, last_name")
        .eq("id", user.id)
        .maybeSingle();
      const nom =
        [profil?.first_name, profil?.last_name].filter(Boolean).join(" ").trim() ||
        profil?.full_name ||
        null;
      visiteur = { connecte: true, nom, email: user.email ?? null };
    }
  }
  // Un visiteur (personne de connecté) a lui aussi le tchat : c'est une
  // des nouveautés de WFG 2, visible dès l'accueil. On ne connaît pas son
  // email : le tchat le lui demande.
  if (!membre && !visiteur.connecte) {
    return Response.json(
      {
        actif: true,
        visiteur: true,
        nom: null,
        prenom: null,
        email: "",
        ia: !!process.env.OPENROUTER_API_KEY,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  return Response.json(
    membre
      ? {
          actif: true,
          nom: membre.nom,
          prenom: membre.prenom,
          email: membre.email,
          // Sans clé, pas de réponse automatique : le tchat transmet à l'équipe.
          ia: !!process.env.OPENROUTER_API_KEY,
        }
      : { actif: false, ...visiteur },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const cle = process.env.OPENROUTER_API_KEY;
  if (!cle) return Response.json({ erreur: "indisponible" }, { status: 503 });

  const membre = await membreAutorise();
  let compte: string;
  let plafond: number;
  let contexte: string;
  if (membre) {
    contexte = `Tu parles à un membre connecté${membre.prenom ? `, qui s'appelle ${membre.prenom}` : ""}.`;
    compte = membre.id;
    plafond = PLAFOND_JOUR;
  } else {
    // Connecté sans droit au tchat (un lecteur) : refusé. Pas connecté du
    // tout : un visiteur, compté par adresse IP, avec un plafond plus bas.
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) return Response.json({ erreur: "refusé" }, { status: 403 });
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "inconnue";
    compte = `ip:${ip}`;
    plafond = PLAFOND_VISITEUR;
    contexte = "Tu parles à un visiteur qui n'a pas encore de compte sur WeFilmGood.";
  }

  const jour = new Date().toISOString().slice(0, 10);
  const c = compteurs.get(compte);
  const n = c?.jour === jour ? c.n : 0;
  if (n >= plafond) return Response.json({ erreur: "plafond" }, { status: 429 });
  compteurs.set(compte, { jour, n: n + 1 });

  let messages: Message[];
  try {
    const corps = (await request.json()) as { messages?: Message[] };
    messages = (corps.messages ?? [])
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-HISTORIQUE)
      .map((m) => ({ role: m.role, content: m.content.slice(0, LONGUEUR_MAX) }));
  } catch {
    return Response.json({ erreur: "requête" }, { status: 400 });
  }
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return Response.json({ erreur: "requête" }, { status: 400 });
  }

  const reponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cle}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://app.wefilmgood.com",
      "X-Title": "WeFilmGood",
    },
    body: JSON.stringify({
      model: MODELE,
      stream: true,
      temperature: 0.3,
      max_tokens: 800,
      messages: [
        { role: "system", content: CONSIGNES_ASSISTANT },
        { role: "system", content: contexte },
        ...messages,
      ],
    }),
  });

  if (!reponse.ok || !reponse.body) {
    console.error("assistant OpenRouter", reponse.status, await reponse.text().catch(() => ""));
    return Response.json({ erreur: "modèle" }, { status: 502 });
  }

  // OpenRouter répond en « server-sent events » : on n'en garde que le texte.
  const lecture = reponse.body.getReader();
  const decodeur = new TextDecoder();
  const encodeur = new TextEncoder();
  let reste = "";

  const flux = new ReadableStream<Uint8Array>({
    async pull(controleur) {
      // On lit jusqu'à avoir du texte à transmettre (ou la fin) : certains
      // morceaux ne portent que des métadonnées.
      for (;;) {
        const { value, done } = await lecture.read();
        if (done) {
          controleur.close();
          return;
        }
        reste += decodeur.decode(value, { stream: true });
        const lignes = reste.split("\n");
        reste = lignes.pop() ?? "";
        let transmis = false;
        for (const ligne of lignes) {
          const donnee = ligne.startsWith("data:") ? ligne.slice(5).trim() : "";
          if (!donnee || donnee === "[DONE]") continue;
          try {
            const morceau = JSON.parse(donnee).choices?.[0]?.delta?.content;
            if (morceau) {
              controleur.enqueue(encodeur.encode(morceau));
              transmis = true;
            }
          } catch {
            // Ligne de maintien de connexion ou morceau incomplet : ignoré.
          }
        }
        if (transmis) return;
      }
    },
    cancel() {
      lecture.cancel().catch(() => {});
    },
  });

  return new Response(flux, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
