import { env, pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

/**
 * Les « vecteurs de sens » (27/09/2026) : un petit modèle multilingue,
 * installé sur le serveur, traduit un mot ou une phrase en coordonnées ;
 * deux textes de sens voisin se retrouvent proches. Il sert à la
 * recherche de la pitchothèque quand les lettres ne suffisent pas
 * (« sardine » → poisson, pêche, mer). Aucun service extérieur, aucun
 * coût : le modèle (≈ 120 Mo) est téléchargé une fois dans
 * ~/.cache/modeles et gardé en mémoire ensuite.
 */
const MODELE = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
export const DIMENSIONS = 384;

env.cacheDir = `${process.env.HOME ?? "/home/wfg"}/.cache/modeles`;

let chargement: Promise<FeatureExtractionPipeline> | null = null;

function modele() {
  if (!chargement) {
    chargement = pipeline("feature-extraction", MODELE, { dtype: "q8" }).catch((e) => {
      chargement = null;
      throw e;
    }) as Promise<FeatureExtractionPipeline>;
  }
  return chargement;
}

/** Les vecteurs (normés) de plusieurs textes, dans l'ordre. */
export async function vecteurs(textes: string[]): Promise<number[][]> {
  if (textes.length === 0) return [];
  const ext = await modele();
  const sortie = await ext(textes, { pooling: "mean", normalize: true });
  return sortie.tolist() as number[][];
}

/** Le vecteur d'un seul texte, ou null si le modèle ne répond pas. */
export async function vecteur(texte: string): Promise<number[] | null> {
  try {
    const [v] = await vecteurs([texte]);
    return v ?? null;
  } catch (e) {
    console.error("vecteurs : modèle indisponible", e);
    return null;
  }
}

/** La forme attendue par Postgres (pgvector) : « [0.1,0.2,…] ». */
export function enTexte(v: number[]): string {
  return `[${v.map((x) => x.toFixed(6)).join(",")}]`;
}
