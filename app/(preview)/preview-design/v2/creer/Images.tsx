"use client";

import { useEffect, useRef, useState } from "react";
import s from "../espace.module.css";
import Icon from "../../Icon";

// Mêmes règles que lib/affiche.ts.
const MAX_IMAGES = 4;
const TAILLE_MAX = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

export type ImageLocale = { cle: string; nom: string; url: string };

/**
 * Bloc Images (preview V2) : jusqu'à 4 images, une principale, aperçus des
 * recadrages V2 (16:9 carte + page, carré « En ce moment »). Les fichiers
 * restent dans le navigateur (URL blob), aucun envoi.
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
  const input = useRef<HTMLInputElement>(null);

  // Libère les URL blob au démontage.
  const courantes = useRef(images);
  courantes.current = images;
  useEffect(() => () => courantes.current.forEach((i) => URL.revokeObjectURL(i.url)), []);

  const principal = images.find((i) => i.cle === principale) ?? images[0] ?? null;

  function ajouter(fichiers: FileList | null) {
    if (!fichiers) return;
    setErreur(null);
    const places = MAX_IMAGES - images.length;
    const acceptes: ImageLocale[] = [];
    let refus: string | null = null;
    for (const f of Array.from(fichiers)) {
      if (acceptes.length >= places) {
        refus = `${MAX_IMAGES} images maximum : les suivantes n'ont pas été ajoutées.`;
        break;
      }
      if (!TYPES.includes(f.type)) {
        refus = `« ${f.name} » n'est pas au bon format. Utilise un JPG, PNG ou WebP.`;
        continue;
      }
      if (f.size > TAILLE_MAX) {
        refus = `« ${f.name} » dépasse 5 Mo. Réduis-la avant de l'ajouter.`;
        continue;
      }
      acceptes.push({ cle: `${f.name}-${f.size}-${f.lastModified}-${Math.random()}`, nom: f.name, url: URL.createObjectURL(f) });
    }
    if (refus) setErreur(refus);
    if (acceptes.length) setImages((prev) => [...prev, ...acceptes]);
    if (input.current) input.current.value = "";
  }

  function retirer(img: ImageLocale) {
    URL.revokeObjectURL(img.url);
    setImages((prev) => prev.filter((i) => i.cle !== img.cle));
    if (principale === img.cle) setPrincipale(null);
    setErreur(null);
  }

  const plein = images.length >= MAX_IMAGES;

  return (
    <>
      <p className={s.aide} style={{ fontSize: 13, lineHeight: "18px" }}>
        Format paysage <b>16:9</b> recommandé (1600 × 900 px). Garde le sujet au centre : l&apos;image est recadrée en carré dans « En ce moment ».
        JPG, PNG ou WebP, 5 Mo maximum.
      </p>

      {!plein && (
        <label
          className={s.depot}
          style={survol ? { boxShadow: "inset 0 0 0 1.5px var(--or)", background: "var(--surface)" } : undefined}
          onDragOver={(e) => {
            e.preventDefault();
            setSurvol(true);
          }}
          onDragLeave={() => setSurvol(false)}
          onDrop={(e) => {
            e.preventDefault();
            setSurvol(false);
            ajouter(e.dataTransfer.files);
          }}
        >
          <Icon name="upload" size={32} />
          <b>{images.length ? "Ajouter d'autres images" : "Ajouter une affiche"}</b>
          <span>
            Touche pour choisir, ou glisse tes fichiers ici · {images.length}/{MAX_IMAGES}
          </span>
          <input
            ref={input}
            type="file"
            accept={TYPES.join(",")}
            multiple
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
                <figcaption>Carte et page de l&apos;événement</figcaption>
              </figure>
              <figure>
                <div className={s.recadrageCarre}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={principal.url} alt="" />
                </div>
                <figcaption>« En ce moment »</figcaption>
              </figure>
            </div>
          )}
        </>
      )}
    </>
  );
}
