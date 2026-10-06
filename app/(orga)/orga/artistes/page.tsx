import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { creerClientServeur } from "@/lib/supabase-server";
import Coquille from "@/components/v2/Coquille";
import Icon from "@/components/v2/Icon";
import { NAV_ORGA } from "@/components/v2/navOrga";
import { initialesArtiste } from "@/components/v2/orga/artistes/initiales";
import s from "@/components/v2/espace.module.css";
import { artistesGeres, propositionsRecues, type StatutArtiste } from "@/lib/artistes";
import { dateCourte, depuis } from "@/components/v2/format";
import { deciderPropositionOrga } from "./actions";

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
export default async function OrgaArtistes({
  searchParams,
}: {
  searchParams: { envoye?: string; publie?: string; maj?: string; proposition?: string; decision?: string };
}) {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Lien de l'e-mail de proposition : la proposition visée survit à la connexion.
  const cible = /^[0-9a-f-]{36}\.[0-9a-f-]{36}$/.test(searchParams.proposition ?? "") ? searchParams.proposition! : null;
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(cible ? `/orga/artistes?proposition=${cible}` : "/orga/artistes")}`);

  const [{ data: profil }, artistes] = await Promise.all([
    supabase.from("profiles").select("nom, nom_public").eq("id", user.id).maybeSingle(),
    artistesGeres(user.id),
  ]);
  const propositions = await propositionsRecues(user.id, artistes);
  const message = searchParams.envoye
    ? "Demande envoyée. L'équipe XwézanEvent te contacte par WhatsApp ou par e-mail pour finaliser la vérification."
    : searchParams.publie
      ? "Page publiée. Elle est en ligne."
      : searchParams.maj
        ? "Modifications enregistrées."
        : searchParams.decision === "acceptee"
          ? "Proposition acceptée : l'artiste s'affiche sur l'événement et l'événement sur sa page."
          : searchParams.decision === "refusee"
            ? "Proposition refusée : l'artiste n'apparaîtra pas sur cet événement. L'organisateur le voit sur sa fiche."
            : searchParams.decision === "deja" || (cible && !propositions.some((p) => p.cle === cible))
              ? "Cette proposition a déjà été traitée."
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

      {propositions.length > 0 && (
        <section aria-labelledby="propositions-titre" style={{ marginBottom: 24 }}>
          <h2 id="propositions-titre" className={s.intertitre}>
            Propositions <span style={{ opacity: 0.6 }}>{propositions.length}</span>
          </h2>
          <p className={s.aide} style={{ marginBottom: 12 }}>
            Des organisateurs veulent afficher tes artistes sur leur événement. Rien n&apos;apparaît avant ton accord.
          </p>
          <ul className={s.pile} style={{ gap: 8 }}>
            {propositions.map((p) => (
              <li key={p.cle} id={`proposition-${p.cle}`} className={`${s.carte} ${s.carteRangee} ${p.cle === cible ? s.carteEnAvant : ""}`}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", minWidth: 0 }}>
                  <div className={s.avatarArtiste} aria-hidden="true">
                    {p.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photo} alt="" />
                    ) : (
                      <span>{initialesArtiste(p.artiste)}</span>
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p className={s.carteTitre}>{p.titre}</p>
                    <p className={s.carteMeta}>
                      Avec <b>{p.artiste}</b> · {dateCourte(p.debut, p.fin)} · {p.lieu}, {p.ville}
                    </p>
                    <p className={s.carteMeta}>
                      Proposé par <b>{p.organisateur}</b>, {depuis(p.proposeLe)}
                      {p.statutEvenement !== "publie" ? " · événement pas encore en ligne" : ""}
                    </p>
                  </div>
                </div>
                <form action={deciderPropositionOrga} className={s.propositionActions}>
                  <input type="hidden" name="cle" value={p.cle} />
                  {p.statutEvenement === "publie" && (
                    <Link href={`/evenement/${p.slug}`} className={`${s.btn} ${s.btnGris}`}>
                      <Icon name="eye" size={16} /> Voir
                    </Link>
                  )}
                  <button type="submit" name="decision" value="refuser" className={`${s.btn} ${s.btnGris}`}>
                    Refuser
                  </button>
                  <button type="submit" name="decision" value="accepter" className={`${s.btn} ${s.btnOr}`}>
                    <Icon name="check" size={16} /> Accepter
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {propositions.length > 0 && artistes.length > 0 && (
        <h2 className={s.intertitre}>Tes artistes</h2>
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
