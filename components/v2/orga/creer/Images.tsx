"use client";

import { useEffect, useRef, useState } from "react";
import s from "../../espace.module.css";
import Icon from "../../Icon";
import { MAX_IMAGES, TYPES_AFFICHE_AUTORISES } from "@/lib/affiche";
import { compresserImage, POIDS_MAX_ORIGINAL, POIDS_MAX_TOTAL } from "@/lib/compression-image";

const TYPES = Object.keys(TYPES_AFFICHE_AUTORISES);

/** `fichier` : image nouvellement ajoutée (compressée) ; null pour une image déjà en ligne (modification). */
export type ImageLocale = { cle: string; nom: string; url: string; fichier: File | null };

/**
 * Bloc Images (V2), repris de la preview (v2/creer/Images.tsx) : jusqu'à 4
 * images, une principale, aperçu du recadrage V2 (16:9). Chaque fichier est
 * compressé dans le navigateur avant d'être gardé (lib/compression-image.ts :
 * Vercel refuse les requêtes de plus de 4,5 Mo) ; le formulaire l'envoie
 * ensuite à l'action serveur (images_nouvelles). En modification, les images
 * déjà en ligne arrivent sans fichier et sont conservées par leur adresse.
 */
export default function Images({
  images,
  setImages,
  principale,
  setPrincipale,
}: {
  images: ImageLocale[];
  setImages: (f: (prev: ImageLocale[]) => ImageLocale[]) => void;
  principale: string | null;
  setPrincipale: (cle: string | null) => void;
}) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [survol, setSurvol] = useState(false);
  const [preparation, setPreparation] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  // Libère les URL blob au démontage.
  const courantes = useRef(images);
  courantes.current = images;
  useEffect(() => () => courantes.current.forEach((i) => i.fichier && URL.revokeObjectURL(i.url)), []);

  const principal = images.find((i) => i.cle === principale) ?? images[0] ?? null;

  async function ajouter(fichiers: FileList | null) {
    if (!fichiers) return;
    const liste = Array.from(fichiers);
    if (input.current) input.current.value = "";
    setErreur(null);
    const places = MAX_IMAGES - images.length;
    let total = images.reduce((n, i) => n + (i.fichier?.size ?? 0), 0);
    const acceptes: ImageLocale[] = [];
    let refus: string | null = null;
    setPreparation(true);
    for (const f of liste) {
      if (acceptes.length >= places) {
        refus = `${MAX_IMAGES} images maximum : les suivantes n'ont pas été ajoutées.`;
        break;
      }
      if (!TYPES.includes(f.type)) {
        refus = `« ${f.name} » n'est pas au bon format. Utilise un JPG, PNG ou WebP.`;
        continue;
      }
      if (f.size > POIDS_MAX_ORIGINAL) {
        refus = `« ${f.name} » dépasse 25 Mo. Choisis une image plus légère.`;
        continue;
      }
      let fichier: File;
      try {
        fichier = await compresserImage(f);
      } catch {
        refus = `« ${f.name} » n'a pas pu être préparée. Essaie une autre image.`;
        continue;
      }
      if (total + fichier.size > POIDS_MAX_TOTAL) {
        refus = "Les images sont trop lourdes au total. Retire une image ou choisis-en une plus légère.";
        break;
      }
      total += fichier.size;
      acceptes.push({ cle: `${f.name}-${f.size}-${f.lastModified}-${Math.random()}`, nom: f.name, url: URL.createObjectURL(fichier), fichier });
    }
    setPreparation(false);
    if (refus) setErreur(refus);
    if (acceptes.length) setImages((prev) => [...prev, ...acceptes]);
  }

  function retirer(img: ImageLocale) {
    if (img.fichier) URL.revokeObjectURL(img.url);
    setImages((prev) => prev.filter((i) => i.cle !== img.cle));
    if (principale === img.cle) setPrincipale(null);
    setErreur(null);
  }

  const plein = images.length >= MAX_IMAGES;

  return (
    <>
      <p className={s.aide} style={{ fontSize: 13, lineHeight: "18px" }}>
        Format paysage <b>16:9</b> recommandé (1600 × 900 px). Garde le sujet au centre : l&apos;image est recadrée en 16:9 si elle a un autre format.
        JPG, PNG ou WebP, allégées automatiquement avant l&apos;envoi.
      </p>

      {!plein && (
        <label
          className={s.depot}
          aria-busy={preparation}
          style={survol ? { boxShadow: "inset 0 0 0 1.5px var(--or)", background: "var(--surface)" } : undefined}
          onDragOver={(e) => {
            e.preventDefault();
            setSurvol(true);
          }}
          onDragLeave={() => setSurvol(false)}
          onDrop={(e) => {
            e.preventDefault();
            setSurvol(false);
            if (!preparation) ajouter(e.dataTransfer.files);
          }}
        >
          <Icon name="upload" size={32} />
          <b>{preparation ? "Préparation de l'image…" : images.length ? "Ajouter d'autres images" : "Ajouter une affiche"}</b>
          <span>
            Touche pour choisir, ou glisse tes fichiers ici · {images.length}/{MAX_IMAGES}
          </span>
          <input
            ref={input}
            type="file"
            accept={TYPES.join(",")}
            multiple
            disabled={preparation}
            className={s.srOnly}
            aria-describedby={erreur ? "img-err" : undefined}
            onChange={(e) => ajouter(e.target.files)}
          />
        </label>
      )}

      {erreur && (
        <p id="img-err" className={s.erreur} role="alert">
          {erreur}
        </p>
      )}

      {images.length > 0 && (
        <>
          <ul className={s.vignettes} aria-label="Images ajoutées">
            {images.map((img, i) => {
              const estPrincipale = principal?.cle === img.cle;
              return (
                <li key={img.cle} className={`${s.vignette} ${estPrincipale ? s.vignetteOn : ""}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={`Image ${i + 1} : ${img.nom}`} />
                  <button
                    type="button"
                    className={s.vignetteChoix}
                    aria-pressed={estPrincipale}
                    aria-label={estPrincipale ? `Image ${i + 1}, image principale` : `Choisir l'image ${i + 1} comme image principale`}
                    onClick={() => setPrincipale(img.cle)}
                  />
                  {estPrincipale && <span className={s.vignetteTag}>Principale</span>}
                  <button type="button" className={s.vignetteRetirer} aria-label={`Retirer l'image ${i + 1}`} onClick={() => retirer(img)}>
                    <Icon name="x" size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
          <p className={s.aide}>
            {images.length > 1 ? "Touche une image pour en faire l'image principale. Les autres défilent sur la page de l'événement." : "Tu peux ajouter jusqu'à 3 images de plus pour le carrousel de la page."}
          </p>

          {principal && (
            <div className={s.recadrages}>
              <figure>
                <div className={s.recadrage169}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={principal.url} alt="" />
                </div>
                <figcaption>Cartes, page de l&apos;événement et « Épinglé »</figcaption>
              </figure>
            </div>
          )}
        </>
      )}
    </>
  );
}
