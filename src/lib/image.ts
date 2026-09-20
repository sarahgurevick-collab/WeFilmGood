import sharp from "sharp";

/**
 * Allège une image déposée, sans que l'auteur ait à s'en occuper.
 *
 * Les auteurs déposent les photos telles que sorties de l'appareil —
 * 15 à 20 Mo pour une vignette affichée à 400 pixels de large. Ramenée à
 * 1600 pixels et réencodée, la même image pèse environ 300 Ko : 98 % de
 * moins, sans différence visible à l'écran. C'est le travail que Sarah
 * faisait à la main, image par image, sur un site de compression.
 *
 * La rotation EXIF est appliquée au passage : une photo prise au
 * téléphone s'affiche sinon couchée.
 *
 * En cas d'échec — format exotique, fichier abîmé — on renvoie l'image
 * d'origine. Mieux vaut une image lourde qu'un dépôt qui échoue.
 */
const LARGEUR_MAX = 1600;
const QUALITE = 82;

export type ImageTraitee = {
  donnees: Buffer;
  type: string;
  poidsAvant: number;
  poidsApres: number;
};

export async function alleger(fichier: File): Promise<ImageTraitee> {
  const origine = Buffer.from(await fichier.arrayBuffer());

  try {
    const image = sharp(origine, { failOn: "none" }).rotate();
    const infos = await image.metadata();

    // La transparence ne survit pas au JPEG : ces images restent en PNG.
    const transparent = infos.hasAlpha === true;

    const redimensionnee = image.resize({
      width: LARGEUR_MAX,
      withoutEnlargement: true,
    });

    const donnees = transparent
      ? await redimensionnee.png({ compressionLevel: 9, palette: true }).toBuffer()
      : await redimensionnee.jpeg({ quality: QUALITE, mozjpeg: true }).toBuffer();

    // Si le traitement n'allège pas — petite image déjà optimisée — on
    // garde l'original plutôt que de le dégrader pour rien.
    if (donnees.length >= origine.length) {
      return {
        donnees: origine,
        type: fichier.type,
        poidsAvant: origine.length,
        poidsApres: origine.length,
      };
    }

    return {
      donnees,
      type: transparent ? "image/png" : "image/jpeg",
      poidsAvant: origine.length,
      poidsApres: donnees.length,
    };
  } catch {
    return {
      donnees: origine,
      type: fichier.type,
      poidsAvant: origine.length,
      poidsApres: origine.length,
    };
  }
}
