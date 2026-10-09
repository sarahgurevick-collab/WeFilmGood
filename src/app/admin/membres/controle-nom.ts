"use server";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Le contrôle du nom (09/10/2026, demande de Sarah) : la page de la référence
 * professionnelle (IMDb, Unifrance, Vimeo, site personnel) cite-t-elle le
 * prénom et le nom du talent ? Une aide à la décision de l'administration,
 * rien de plus : jamais de validation ni de blocage automatique.
 *
 * IMDb refuse la lecture automatique : le lien est alors « illisible », à
 * ouvrir à la main. Un pseudonyme se vérifie sur le site de la personne :
 * le titre de la page est montré pour en juger.
 */
export type ResultatControle = {
  etat: "trouve" | "partiel" | "absent" | "illisible" | "sans_lien";
  lien?: string;
  titre?: string;
  detail?: string;
};

const sansAccent = (t: string) =>
  t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Refuse les adresses internes : le serveur ne doit pas lire n'importe quoi. */
async function adresseExterne(url: URL): Promise<boolean> {
  if (!["http:", "https:"].includes(url.protocol)) return false;
  const hote = url.hostname;
  const adresses = isIP(hote) ? [{ address: hote }] : await lookup(hote, { all: true }).catch(() => []);
  if (adresses.length === 0) return false;
  return adresses.every(({ address }) => {
    if (address.includes(":")) return !/^(::1|f[cd]|fe80)/i.test(address);
    const [a, b] = address.split(".").map(Number);
    return !(
      a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
    );
  });
}

async function lirePage(adresse: string): Promise<{ html: string } | { erreur: string }> {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(adresse) ? adresse : `https://${adresse}`);
  } catch {
    return { erreur: "adresse invalide" };
  }
  for (let saut = 0; saut < 4; saut++) {
    if (!(await adresseExterne(url))) return { erreur: "adresse non autorisée" };
    let reponse: Response;
    try {
      reponse = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(8000),
        headers: {
          "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
          "accept-language": "fr,en;q=0.8",
        },
      });
    } catch {
      return { erreur: "page injoignable" };
    }
    if (reponse.status >= 300 && reponse.status < 400) {
      const suite = reponse.headers.get("location");
      if (!suite) return { erreur: "redirection sans suite" };
      url = new URL(suite, url);
      continue;
    }
    if (reponse.status !== 200) {
      return { erreur: reponse.status === 202 || reponse.status === 403 ? "lecture automatique refusée" : `page en erreur (${reponse.status})` };
    }
    const html = (await reponse.text()).slice(0, 1_500_000);
    if (html.trim().length < 200) return { erreur: "page vide (lecture automatique refusée)" };
    return { html };
  }
  return { erreur: "trop de redirections" };
}

export async function controlerNom(profileId: string): Promise<ResultatControle> {
  const supabase = await createClient();
  const { data: admin } = await supabase.rpc("is_admin");
  if (admin !== true) return { etat: "illisible", detail: "réservé à l'administration" };

  const service = createAdminClient();
  if (!service) return { etat: "illisible", detail: "service indisponible" };
  const { data: p } = await service
    .from("profiles")
    .select("first_name, last_name, full_name, website")
    .eq("id", profileId)
    .maybeSingle<{ first_name: string | null; last_name: string | null; full_name: string | null; website: string | null }>();
  const lien = (p?.website ?? "").trim();
  if (!p || !lien) return { etat: "sans_lien" };

  const page = await lirePage(lien);
  if ("erreur" in page) return { etat: "illisible", lien, detail: page.erreur };

  const titre = page.html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim().slice(0, 80);
  const metas = [...page.html.matchAll(/<meta[^>]+content=["']([^"']{2,300})["']/gi)].map((m) => m[1]).join(" ");
  const corps = page.html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
  const texte = ` ${sansAccent(`${titre ?? ""} ${metas} ${corps}`)} `;

  const prenom = sansAccent(p.first_name ?? p.full_name?.split(" ")[0] ?? "");
  const nom = sansAccent(p.last_name ?? p.full_name?.split(" ").slice(1).join(" ") ?? "");
  const a = (mot: string) => mot.length >= 2 && texte.includes(` ${mot} `);
  const aPrenom = a(prenom);
  const aNom = a(nom);
  const etat = aPrenom && aNom ? "trouve" : aPrenom || aNom ? "partiel" : "absent";
  return {
    etat,
    lien,
    titre,
    detail: etat === "partiel" ? (aNom ? "seul le nom est cité" : "seul le prénom est cité") : undefined,
  };
}
