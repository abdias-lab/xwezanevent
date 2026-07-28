"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_IMAGES, TAILLE_AFFICHE_MAX, TYPES_AFFICHE_AUTORISES } from "@/lib/affiche";

interface SlotExistante {
  key: string;
  type: "existante";
  url: string;
}
interface SlotNouvelle {
  key: string;
  type: "nouvelle";
  file: File;
  preview: string;
}
type Slot = SlotExistante | SlotNouvelle;

/**
 * Sélecteur multi-images (jusqu'à MAX_IMAGES) avec désignation de l'image
 * principale, partagé entre création et édition. Rend ses propres hidden
 * inputs pour être posé tel quel dans un <form> :
 * - "images_conservees" : JSON des URLs d'images existantes gardées, dans
 *   l'ordre d'affichage (vide à la création).
 * - "images_nouvelles" : fichiers ajoutés (input file multiple synchronisé
 *   via DataTransfer, dans l'ordre d'affichage).
 * - "image_principale_type" / "image_principale_valeur" : désigne l'image
 *   principale — soit une URL existante (type "existante"), soit l'index
 *   du fichier dans "images_nouvelles" (type "nouvelle").
 *
 * `imagesInitiales` permet de préremplir avec les images déjà en base
 * (édition) ; laisser vide pour la création.
 */
export default function SelecteurImages({
  imagesInitiales = [],
  onApercuPrincipalChange,
}: {
  imagesInitiales?: { url: string }[];
  /** Notifie le parent de l'URL (ou preview blob) de l'image principale courante, pour un aperçu en direct. */
  onApercuPrincipalChange?: (src: string | null) => void;
}) {
  const [slots, setSlots] = useState<Slot[]>(() =>
    imagesInitiales.map((img) => ({ key: `existante:${img.url}`, type: "existante", url: img.url }))
  );
  const [principaleKey, setPrincipaleKey] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const inputFichierRef = useRef<HTMLInputElement>(null);
  const inputNouvellesRef = useRef<HTMLInputElement>(null);

  // Révoque les URL objet créées pour les aperçus au démontage.
  useEffect(() => {
    return () => {
      for (const s of slots) {
        if (s.type === "nouvelle") URL.revokeObjectURL(s.preview);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Maintient le <input type="file" name="images_nouvelles"> synchronisé
  // avec les slots "nouvelle" courants (DataTransfer : seul moyen de piloter
  // par JS le FileList d'un input file, qui reste sinon en lecture seule).
  useEffect(() => {
    if (!inputNouvellesRef.current) return;
    const dt = new DataTransfer();
    for (const s of slots) {
      if (s.type === "nouvelle") dt.items.add(s.file);
    }
    inputNouvellesRef.current.files = dt.files;
  }, [slots]);

  const principaleEffective =
    slots.find((s) => s.key === principaleKey)?.key ?? slots[0]?.key ?? null;

  const principal = slots.find((s) => s.key === principaleEffective);
  let principaleType: "existante" | "nouvelle" | "" = "";
  let principaleValeur = "";
  if (principal) {
    if (principal.type === "existante") {
      principaleType = "existante";
      principaleValeur = principal.url;
    } else {
      principaleType = "nouvelle";
      const indexParmiNouvelles = slots
        .filter((s): s is SlotNouvelle => s.type === "nouvelle")
        .findIndex((s) => s.key === principal.key);
      principaleValeur = String(indexParmiNouvelles);
    }
  }

  useEffect(() => {
    if (!onApercuPrincipalChange) return;
    if (!principal) {
      onApercuPrincipalChange(null);
      return;
    }
    onApercuPrincipalChange(principal.type === "existante" ? principal.url : principal.preview);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [principal?.key]);

  function ajouterFichier(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0] ?? null;
    e.target.value = "";
    setErreur(null);
    if (!fichier) return;

    if (slots.length >= MAX_IMAGES) {
      setErreur(`${MAX_IMAGES} images maximum.`);
      return;
    }
    if (!TYPES_AFFICHE_AUTORISES[fichier.type]) {
      setErreur("Format non supporté — utilise un JPG, PNG ou WebP.");
      return;
    }
    if (fichier.size > TAILLE_AFFICHE_MAX) {
      setErreur("L'image dépasse 5 Mo.");
      return;
    }

    const slot: SlotNouvelle = {
      key: `nouvelle:${crypto.randomUUID()}`,
      type: "nouvelle",
      file: fichier,
      preview: URL.createObjectURL(fichier),
    };
    setSlots((prev) => [...prev, slot]);
  }

  function retirer(key: string) {
    setSlots((prev) => {
      const slot = prev.find((s) => s.key === key);
      if (slot?.type === "nouvelle") URL.revokeObjectURL(slot.preview);
      return prev.filter((s) => s.key !== key);
    });
  }

  return (
    <div className="champ-bloc">
      <input type="hidden" name="images_conservees" value={JSON.stringify(
        slots.filter((s): s is SlotExistante => s.type === "existante").map((s) => s.url)
      )} />
      <input type="hidden" name="image_principale_type" value={principaleType} />
      <input type="hidden" name="image_principale_valeur" value={principaleValeur} />
      <input
        ref={inputNouvellesRef}
        type="file"
        name="images_nouvelles"
        multiple
        style={{ display: "none" }}
      />

      <label>
        Images <small>(JPG, PNG ou WebP — 5 Mo max, {MAX_IMAGES} maximum)</small>
      </label>
      <div className="images-grille">
        {slots.map((s) => {
          const src = s.type === "existante" ? s.url : s.preview;
          const estPrincipale = s.key === principaleEffective;
          return (
            <div className={`image-slot${estPrincipale ? " image-slot-principale" : ""}`} key={s.key}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" />
              <button
                type="button"
                className="image-slot-etoile"
                aria-pressed={estPrincipale}
                title="Définir comme image principale"
                onClick={() => setPrincipaleKey(s.key)}
              >
                {estPrincipale ? "★ Principale" : "☆"}
              </button>
              <button
                type="button"
                className="image-slot-retirer"
                title="Retirer cette image"
                onClick={() => retirer(s.key)}
              >
                ✕
              </button>
            </div>
          );
        })}
        {slots.length < MAX_IMAGES && (
          <button type="button" className="image-slot-ajouter" onClick={() => inputFichierRef.current?.click()}>
            <span>+ Ajouter</span>
          </button>
        )}
      </div>
      <input
        ref={inputFichierRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={ajouterFichier}
      />
      {erreur && (
        <p className="alerte-erreur" style={{ marginTop: 10 }}>
          {erreur}
        </p>
      )}
    </div>
  );
}
