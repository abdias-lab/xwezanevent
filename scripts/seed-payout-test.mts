/**
 * ⚠️ SCRIPT DE TEST UNIQUEMENT — ne jamais exécuter en production.
 * Crée un faux événement + une fausse commande payée. Se refuse à tourner
 * si FEDAPAY_ENVIRONMENT=live ou NODE_ENV=production (voir garde ci-dessous).
 * -----------------------------------------------------------------------------
 * Seed ad hoc — commande de test « J+3 satisfait » pour retester la demande
 * de virement (formulaire /orga, en particulier Celtiis).
 *
 * Crée, sous le compte organisateur de test :
 *   1. Un nouvel événement publié, daté d'il y a 7 jours (le délai J+3 est
 *      donc déjà satisfait — lib/payouts.ts::payoutDisponible === true)
 *   2. Un ticket_type "Standard"
 *   3. Une commande payée (via finaliserCommande, comme en production :
 *      claim atomique + réservation de stock + génération des billets)
 *
 * Chaque exécution crée un NOUVEL événement (slug horodaté) : pas de risque
 * d'écraser un test précédent ou de fausser le solde disponible. Pense à
 * nettoyer (voir COMPTES_TEST.md) une fois les tests terminés.
 *
 * Exécution : npm run seed:payout-test
 */
import { randomBytes } from "node:crypto";
import { supabaseAdmin } from "../lib/supabase-admin.ts";
import { finaliserCommande } from "../lib/commandes.ts";
import { montantDisponible, payoutDisponible, dateDisponibilitePayout } from "../lib/payouts.ts";
import { aujourdhuiPortoNovo, ajouterJours } from "../lib/date.ts";

const ORGA_EMAIL = "organisateur@xwezanevent-test.com";
const ACHETEUR_EMAIL = "acheteur@xwezanevent-test.com";
const ACHETEUR_NOM = "Acheteur Test";

const PRIX_BILLET = 10000; // FCFA
const QUANTITE_ACHETEE = 5;

function genererMotDePasse(): string {
  const base = randomBytes(24).toString("base64url").slice(0, 28);
  return `${base}Aa1!`;
}

async function trouverUserParEmail(email: string): Promise<string | null> {
  const perPage = 200;
  for (let page = 1; ; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found.id;
    if (data.users.length < perPage) return null;
  }
}

/**
 * Refuse de tourner si l'environnement ressemble à de la production. Ce
 * script écrit de fausses données (événement + commande "payée") — un faux
 * positif ici (script qui tourne alors qu'on est en prod) est bien plus
 * dangereux qu'un faux négatif (refus alors qu'on était en dev), donc on
 * bloque sur le moindre signal de prod plutôt que d'essayer d'être malin.
 */
function refuserSiProduction(): void {
  if (process.env.FEDAPAY_ENVIRONMENT === "live") {
    throw new Error(
      "FEDAPAY_ENVIRONMENT=live détecté — ce script de test ne doit jamais tourner en production. Abandon."
    );
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NODE_ENV=production détecté — ce script de test ne doit jamais tourner en production. Abandon."
    );
  }
}

async function main() {
  refuserSiProduction();
  console.log("🌱 Seed test virement (payout)\n");

  // 1. Organisateur de test — doit déjà exister (npm run seed)
  const organisateurId = await trouverUserParEmail(ORGA_EMAIL);
  if (!organisateurId) {
    throw new Error(
      `Compte organisateur de test introuvable (${ORGA_EMAIL}). Lance d'abord "npm run seed".`
    );
  }
  // Mot de passe réinitialisé à chaque run pour être sûr de pouvoir se
  // connecter (le mot de passe généré par un seed précédent n'est visible
  // qu'une fois, dans le terminal de l'époque).
  const motDePasseOrga = genererMotDePasse();
  {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(organisateurId, {
      password: motDePasseOrga,
    });
    if (error) throw error;
  }
  console.log(`  ✓ Organisateur : ${ORGA_EMAIL} — id ${organisateurId}`);

  // 2. Acheteur de test — créé si absent
  let acheteurId = await trouverUserParEmail(ACHETEUR_EMAIL);
  if (!acheteurId) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: ACHETEUR_EMAIL,
      password: genererMotDePasse(),
      email_confirm: true,
      user_metadata: { nom: ACHETEUR_NOM },
    });
    if (error) throw error;
    acheteurId = data.user.id;
    console.log(`  ＋ Acheteur créé : ${ACHETEUR_EMAIL} — id ${acheteurId}`);
  } else {
    console.log(`  ✓ Acheteur : ${ACHETEUR_EMAIL} — id ${acheteurId}`);
  }

  // 3. Événement de test, daté d'il y a 7 jours (slug horodaté = unique à chaque run)
  const horodatage = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const slug = `test-virement-${horodatage}`;
  const dateDebut = ajouterJours(aujourdhuiPortoNovo(), -7);

  const { data: event, error: eventError } = await supabaseAdmin
    .from("events")
    .insert({
      organisateur_id: organisateurId,
      titre: `Test virement (${horodatage}) — usage interne, à supprimer`,
      slug,
      description: "Événement créé par scripts/seed-payout-test.mts pour retester la demande de virement. Ne pas utiliser en production.",
      categorie: "Test",
      ville: "Cotonou",
      lieu: "Bureau — test interne",
      date_debut: dateDebut,
      heure: "20:00",
      statut: "publie",
    })
    .select("id, slug, date_debut")
    .single();
  if (eventError || !event) throw eventError ?? new Error("Création événement échouée");
  console.log(`  ＋ Événement : ${event.slug} (id ${event.id}), date_debut=${event.date_debut}`);

  // 4. Ticket type
  const { data: ticketType, error: ttError } = await supabaseAdmin
    .from("ticket_types")
    .insert({
      event_id: event.id,
      nom: "Standard",
      prix: PRIX_BILLET,
      quantite_totale: 100,
    })
    .select("id")
    .single();
  if (ttError || !ticketType) throw ttError ?? new Error("Création ticket_type échouée");
  console.log(`  ＋ Ticket type Standard (id ${ticketType.id}), ${PRIX_BILLET} FCFA`);

  // 5. Commande + finalisation (identique au chemin webhook de production)
  const total = PRIX_BILLET * QUANTITE_ACHETEE;
  const panier = [
    { ticket_type_id: ticketType.id, nom: "Standard", prix: PRIX_BILLET, quantite: QUANTITE_ACHETEE },
  ];
  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .insert({
      user_id: acheteurId,
      event_id: event.id,
      sous_total: total,
      frais_service: 0,
      total,
      statut: "en_attente",
      panier,
      fedapay_transaction_id: `seed-payout-test-${Date.now()}`,
    })
    .select("id")
    .single();
  if (orderError || !order) throw orderError ?? new Error("Création commande échouée");

  const resultat = await finaliserCommande(order.id, total);
  if (resultat !== "ok") {
    throw new Error(`finaliserCommande a renvoyé "${resultat}" au lieu de "ok"`);
  }
  console.log(`  ＋ Commande payée : ${order.id} (${QUANTITE_ACHETEE} billets, ${total.toLocaleString("fr-FR")} FCFA)`);

  // 6. Vérification finale
  const disponible = await montantDisponible(event.id);
  const dispo = payoutDisponible({ date_debut: event.date_debut });
  const disponibleLe = dateDisponibilitePayout({ date_debut: event.date_debut });

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("✅ Prêt pour tester la demande de virement");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  Événement       : ${event.slug}`);
  console.log(`  Solde disponible: ${disponible.toLocaleString("fr-FR")} FCFA`);
  console.log(`  J+3 satisfait   : ${dispo} (disponible depuis le ${disponibleLe})`);
  console.log(`\n  🔑 Connexion organisateur de test (/orga) :`);
  console.log(`     email    : ${ORGA_EMAIL}`);
  console.log(`     password : ${motDePasseOrga}\n`);
  console.log("  ⚠️  Pense à noter cet événement dans COMPTES_TEST.md pour le nettoyage final.");
}

main().catch((err) => {
  console.error(`\n❌ Échec : ${err?.message || err}`);
  process.exit(1);
});
