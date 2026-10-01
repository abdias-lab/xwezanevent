import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { creerClientServeur } from "@/lib/supabase-server";
import Coquille from "@/components/v2/Coquille";
import Icon from "@/components/v2/Icon";
import { NAV_ORGA } from "@/components/v2/navOrga";
import { initialesArtiste } from "@/components/v2/orga/artistes/initiales";
import s from "@/components/v2/espace.module.css";
import { artistesGeres, type StatutArtiste } from "@/lib/artistes";

export const metadata: Metadata = { title: "Mes artistes — XwézanEvent" };

const STATUT: Record<StatutArtiste, { libelle: string; classe: string }> = {
  valide: { libelle: "En ligne", classe: s.stFort },
  en_validation: { libelle: "En vérification", classe: s.stAttente },
  refuse: { libelle: "Refusé", classe: s.stDanger },
};

/**
 * Mes artistes (V2), repris de la preview (v2/orga/artistes) : artistes que
 * le compte gère (créés par lui, de son label, ou son propre compte), avec
 * leur statut. Hors du groupe (espace) : ouvert à un compte « visiteur »
 * (artiste auto-produit qui n'a encore rien publié), design/ARTISTES.md.
 */
export default async function OrgaArtistes({ searchParams }: { searchParams: { envoye?: string; publie?: string; maj?: string } }) {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/orga/artistes");

  const [{ data: profil }, artistes] = await Promise.all([
    supabase.from("profiles").select("nom, nom_public").eq("id", user.id).maybeSingle(),
    artistesGeres(user.id),
  ]);
  const message = searchParams.envoye
    ? "Demande envoyée. L'équipe XwézanEvent te contacte par WhatsApp ou par e-mail pour finaliser la vérification."
    : searchParams.publie
      ? "Page publiée. Elle est en ligne."
      : searchParams.maj
        ? "Modifications enregistrées."
        : null;

  return (
    <Coquille nav={NAV_ORGA} actif="artistes" compte={{ nom: profil?.nom_public || profil?.nom || user.email || "", email: user.email ?? "" }}>
      <div className={s.entete}>
        <div>
          <h1 className={s.titre}>Mes artistes</h1>
          <p className={s.sousTitre}>Les pages publiques de tes artistes : leurs dates, leur communauté.</p>
        </div>
        {artistes.length > 0 && (
          <Link href="/orga/artistes/nouveau" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`}>
            <Icon name="plus" /> Ajouter un artiste
          </Link>
        )}
      </div>

      {message && (
        <p className={s.alerte} role="status">
          <Icon name="check" />
          <span>{message}</span>
        </p>
      )}

      {artistes.length === 0 ? (
        <div className={s.vide}>
          <Icon name="users" size={32} />
          <p className={s.videTitre}>Aucun artiste pour l&apos;instant</p>
          <p className={s.videTexte}>
            Crée la page de ton artiste, ou la tienne si tu es auto-produit : nom, photo, bio, réseaux, et toutes ses dates au même endroit.
          </p>
          <Link href="/orga/artistes/nouveau" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`}>
            <Icon name="plus" /> Ajouter un artiste
          </Link>
        </div>
      ) : (
        <ul className={s.pile} style={{ gap: 8 }}>
          {artistes.map((a) => (
            <li key={a.id} className={`${s.carte} ${s.carteRangee}`}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", minWidth: 0 }}>
                <div className={s.avatarArtiste} aria-hidden="true">
                  {a.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.photo_url} alt="" />
                  ) : (
                    <span>{initialesArtiste(a.nom_scene)}</span>
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p className={s.carteTitre}>
                    {a.nom_scene}
                    <span className={`${s.statut} ${STATUT[a.statut].classe}`} style={{ marginLeft: 8, verticalAlign: "middle" }}>
                      {STATUT[a.statut].libelle}
                    </span>
                  </p>
                  <p className={s.carteMeta}>{a.compte_id === user.id ? "Ta page artiste" : "Artiste de ton label"}</p>
                  {a.statut === "en_validation" && <p className={s.carteMeta}>L&apos;équipe te contacte par WhatsApp ou par e-mail pour la vérification.</p>}
                  {a.nom_scene_demande && (
                    <p className={s.carteMeta} style={{ color: "var(--or)" }}>
                      Nouveau nom « {a.nom_scene_demande} » en vérification.
                    </p>
                  )}
                  {a.statut === "refuse" && a.motif_refus && <p className={s.carteMeta}>Motif : {a.motif_refus}</p>}
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {a.statut === "valide" && (
                  <Link href={`/artiste/${a.slug}`} className={`${s.btn} ${s.btnGris}`}>
                    <Icon name="eye" size={16} /> Voir la page
                  </Link>
                )}
                <Link href={`/orga/artistes/${a.id}`} className={`${s.btn} ${a.statut === "refuse" ? s.btnOr : s.btnGris}`}>
                  <Icon name="edit" size={16} /> {a.statut === "refuse" ? "Corriger" : "Modifier"}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Coquille>
  );
}
