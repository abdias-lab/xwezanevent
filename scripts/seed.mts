/**
 * Script de seed — XwézanEvent
 * -----------------------------------------------------------------------------
 * Peuple la base Supabase avec des données de test :
 *   1. Un organisateur de test (Auth admin API + profil role='organisateur')
 *   2. Trois événements publiés (statut='publie') inspirés des maquettes
 *   3. Des ticket_types réalistes (Standard / Premium / VIP / VVIP) par événement
 *
 * Idempotent : rejouable sans créer de doublons (vérification par email / slug /
 * nom de ticket_type avant insertion).
 *
 * Exécution :  npm run seed
 *   → node --env-file=.env.local --conditions=react-server --import tsx scripts/seed.mts
 *   - .env.local  : charge NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
 *                   avant l'import du client admin
 *   - react-server: neutralise le garde "server-only" de lib/supabase-admin.ts
 *   - .mts        : force le chargement ESM (le build CJS de supabase-js casse
 *                   le fetch sous tsx)
 */
import { randomBytes } from "node:crypto";
// Extension .ts explicite : tsx charge alors le module en ESM (l'import
// extensionless est résolu en CJS et casse le fetch de supabase-js).
import { supabaseAdmin } from "../lib/supabase-admin.ts";

// -----------------------------------------------------------------------------
// Données
// -----------------------------------------------------------------------------
const ORGA_EMAIL = "organisateur@xwezanevent-test.com";
const ORGA_NOM = "Organisateur Test";

interface SeedTicketType {
  nom: string;
  prix: number; // FCFA
  quantite_totale: number;
}

interface SeedEvent {
  titre: string;
  slug: string;
  description: string;
  categorie: string;
  ville: string;
  lieu: string;
  date_debut: string; // YYYY-MM-DD
  heure: string; // HH:MM
  affiche_url: string;
  ticket_types: SeedTicketType[];
}

const EVENTS: SeedEvent[] = [
  {
    titre: "Vodun Days 2027 — Célébration officielle",
    slug: "vodun-days-2027",
    description:
      "La grande célébration officielle du Vodun : danses, rituels, tambours et costumes traditionnels au cœur de Ouidah.",
    categorie: "Culture & Vodun",
    ville: "Ouidah",
    lieu: "Place aux Enchères",
    date_debut: "2027-01-10",
    heure: "10:00",
    affiche_url: "/images/vodun-days.jpg",
    ticket_types: [
      { nom: "Standard", prix: 5000, quantite_totale: 800 },
      { nom: "Premium", prix: 12000, quantite_totale: 250 },
      { nom: "VIP", prix: 30000, quantite_totale: 60 },
    ],
  },
  {
    titre: "Nuit de l'Afrobeat — 6 artistes en live",
    slug: "nuit-de-l-afrobeat-2027",
    description:
      "Six artistes afrobeat sur scène pour une nuit entière de live, DJ set et show lumière au Palais des Congrès.",
    categorie: "Concert",
    ville: "Cotonou",
    lieu: "Palais des Congrès",
    date_debut: "2027-01-17",
    heure: "20:00",
    affiche_url: "/images/afrobeat.jpg",
    ticket_types: [
      { nom: "Standard", prix: 10000, quantite_totale: 1000 },
      { nom: "Premium", prix: 20000, quantite_totale: 400 },
      { nom: "VIP", prix: 50000, quantite_totale: 100 },
      { nom: "VVIP", prix: 100000, quantite_totale: 25 },
    ],
  },
  {
    titre: "Soirée Zouk & Love — Saint-Valentin sur la plage",
    slug: "soiree-zouk-and-love-2027",
    description:
      "Une soirée zouk romantique les pieds dans le sable à Fidjrossè pour la Saint-Valentin : orchestre live, dîner et feu d'artifice.",
    categorie: "Soirée",
    ville: "Cotonou",
    lieu: "Fidjrossè Plage",
    date_debut: "2027-02-14",
    heure: "19:30",
    affiche_url: "/images/zouk.jpg",
    ticket_types: [
      { nom: "Standard (couple)", prix: 15000, quantite_totale: 500 },
      { nom: "Premium", prix: 25000, quantite_totale: 200 },
      { nom: "VIP", prix: 60000, quantite_totale: 50 },
    ],
  },
];

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
function genererMotDePasse(): string {
  // 24 octets aléatoires -> base64url, on garantit une classe de chaque type
  const base = randomBytes(24).toString("base64url").slice(0, 28);
  return `${base}Aa1!`;
}

async function trouverUserParEmail(email: string): Promise<string | null> {
  // listUsers est paginé ; on parcourt jusqu'à trouver ou épuiser les pages
  const perPage = 200;
  for (let page = 1; ; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw error;
    const found = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (found) return found.id;
    if (data.users.length < perPage) return null; // dernière page
  }
}

// -----------------------------------------------------------------------------
// 1. Organisateur de test
// -----------------------------------------------------------------------------
async function seedOrganisateur(): Promise<string> {
  const motDePasse = genererMotDePasse();
  let userId = await trouverUserParEmail(ORGA_EMAIL);

  if (userId) {
    console.log(`  ↺ Utilisateur déjà présent (${ORGA_EMAIL}) — id ${userId}`);
    // On réinitialise le mot de passe pour qu'il soit toujours connu après un rejeu
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: motDePasse,
    });
    if (error) throw error;
    console.log(`    ✎ Mot de passe réinitialisé`);
  } else {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: ORGA_EMAIL,
      password: motDePasse,
      email_confirm: true,
      user_metadata: { nom: ORGA_NOM },
    });
    if (error) throw error;
    userId = data.user.id;
    console.log(`  ＋ Utilisateur créé (${ORGA_EMAIL}) — id ${userId}`);
  }

  // Profil : passage en role='organisateur' (le trigger handle_new_user l'a créé
  // en role='visiteur'). upsert pour être robuste si la ligne manque.
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert(
      { id: userId, nom: ORGA_NOM, role: "organisateur" },
      { onConflict: "id" }
    );
  if (profileError) throw profileError;
  console.log(`    ✓ Profil en role='organisateur'`);

  console.log(`\n  🔑 Identifiants de connexion du compte de test :`);
  console.log(`     email    : ${ORGA_EMAIL}`);
  console.log(`     password : ${motDePasse}\n`);

  return userId;
}

// -----------------------------------------------------------------------------
// 2 & 3. Événements + ticket_types
// -----------------------------------------------------------------------------
async function seedEvenement(organisateurId: string, ev: SeedEvent) {
  // Vérification d'existence par slug (unique)
  const { data: existant, error: selError } = await supabaseAdmin
    .from("events")
    .select("id")
    .eq("slug", ev.slug)
    .maybeSingle();
  if (selError) throw selError;

  let eventId: string;
  if (existant) {
    eventId = existant.id;
    console.log(`  ↺ Événement déjà présent : « ${ev.titre} » (${ev.slug})`);
  } else {
    const { data, error } = await supabaseAdmin
      .from("events")
      .insert({
        organisateur_id: organisateurId,
        titre: ev.titre,
        slug: ev.slug,
        description: ev.description,
        categorie: ev.categorie,
        ville: ev.ville,
        lieu: ev.lieu,
        date_debut: ev.date_debut,
        heure: ev.heure,
        affiche_url: ev.affiche_url,
        statut: "publie",
      })
      .select("id")
      .single();
    if (error) throw error;
    eventId = data.id;
    console.log(`  ＋ Événement créé : « ${ev.titre} » (${ev.slug})`);
  }

  // ticket_types : on n'insère que ceux qui manquent (par nom, pour cet event)
  const { data: existants, error: ttSelError } = await supabaseAdmin
    .from("ticket_types")
    .select("nom")
    .eq("event_id", eventId);
  if (ttSelError) throw ttSelError;
  const nomsExistants = new Set((existants ?? []).map((t) => t.nom));

  const aInserer = ev.ticket_types
    .filter((t) => !nomsExistants.has(t.nom))
    .map((t) => ({
      event_id: eventId,
      nom: t.nom,
      prix: t.prix,
      quantite_totale: t.quantite_totale,
    }));

  if (aInserer.length > 0) {
    const { error } = await supabaseAdmin.from("ticket_types").insert(aInserer);
    if (error) throw error;
    console.log(
      `    ＋ ${aInserer.length} ticket_type(s) : ${aInserer
        .map((t) => t.nom)
        .join(", ")}`
    );
  }
  const dejaLa = ev.ticket_types.length - aInserer.length;
  if (dejaLa > 0) {
    console.log(`    ↺ ${dejaLa} ticket_type(s) déjà présent(s)`);
  }
}

// -----------------------------------------------------------------------------
// Vérification finale
// -----------------------------------------------------------------------------
async function verifier() {
  const slugs = EVENTS.map((e) => e.slug);
  const { data, error } = await supabaseAdmin
    .from("events")
    .select(
      "titre, slug, statut, ville, date_debut, ticket_types(nom, prix, quantite_totale)"
    )
    .in("slug", slugs)
    .order("date_debut", { ascending: true });
  if (error) throw error;

  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`VÉRIFICATION — ${data?.length ?? 0}/3 événements publiés en base`);
  console.log("═══════════════════════════════════════════════════════════════");
  for (const ev of data ?? []) {
    const tts = (ev.ticket_types ?? []) as SeedTicketType[];
    console.log(
      `\n• ${ev.titre}\n  slug=${ev.slug} · statut=${ev.statut} · ${ev.ville} · ${ev.date_debut} · ${tts.length} ticket_types`
    );
    for (const t of tts.sort((a, b) => a.prix - b.prix)) {
      console.log(
        `    - ${t.nom.padEnd(20)} ${t.prix.toLocaleString("fr-FR")} FCFA` +
          ` × ${t.quantite_totale}`
      );
    }
  }
  console.log("");

  if ((data?.length ?? 0) !== 3) {
    throw new Error(
      `Attendu 3 événements, trouvé ${data?.length ?? 0}. Seed incomplet.`
    );
  }
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------
async function main() {
  console.log("🌱 Seed XwézanEvent\n");
  console.log("→ Organisateur de test");
  const organisateurId = await seedOrganisateur();

  console.log("→ Événements & ticket_types");
  for (const ev of EVENTS) {
    await seedEvenement(organisateurId, ev);
  }
  console.log("");

  await verifier();
  console.log("✅ Seed terminé avec succès.");
}

main().catch((err) => {
  const details =
    err?.name === "AuthRetryableFetchError" && err?.status === 500
      ? "\n   (Auth 500 : le trigger handle_new_user échoue probablement — " +
        "appliquer la migration 20260708120000_fix_handle_new_user_search_path.sql)"
      : "";
  console.error(
    `\n❌ Échec du seed : ${err?.message || err?.name || err}` + details
  );
  process.exit(1);
});
