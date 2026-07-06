-- Supabase SQL Migration: xwezanevent schema initialization
-- Date: 2026-07-06

-- ========================================
-- 1. TABLES
-- ========================================

-- Table: profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  telephone TEXT,
  role TEXT NOT NULL DEFAULT 'visiteur' CHECK (role IN ('visiteur', 'organisateur', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: events
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisateur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  titre TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  categorie TEXT,
  ville TEXT NOT NULL,
  lieu TEXT NOT NULL,
  date_debut DATE NOT NULL,
  heure TIME,
  affiche_url TEXT,
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'en_validation', 'publie', 'termine', 'refuse')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: ticket_types
CREATE TABLE ticket_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  prix INTEGER NOT NULL, -- FCFA sans décimales
  quantite_totale INTEGER NOT NULL,
  quantite_vendue INTEGER NOT NULL DEFAULT 0,
  vente_jusqua TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  sous_total INTEGER NOT NULL,
  frais_service INTEGER NOT NULL,
  total INTEGER NOT NULL,
  statut TEXT NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'paye', 'echoue', 'rembourse')),
  fedapay_transaction_id TEXT,
  moyen_paiement TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: tickets
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  ticket_type_id UUID NOT NULL REFERENCES ticket_types(id) ON DELETE CASCADE,
  code_qr UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  statut TEXT NOT NULL DEFAULT 'valide' CHECK (statut IN ('valide', 'utilise', 'annule')),
  utilise_le TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: payouts
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisateur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  montant INTEGER NOT NULL,
  moyen TEXT NOT NULL CHECK (moyen IN ('mtn', 'moov')),
  statut TEXT NOT NULL DEFAULT 'demande' CHECK (statut IN ('demande', 'traite')),
  traite_le TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 2. INDEXES
-- ========================================

CREATE INDEX idx_events_organisateur_id ON events(organisateur_id);
CREATE INDEX idx_events_statut ON events(statut);
CREATE INDEX idx_ticket_types_event_id ON ticket_types(event_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_event_id ON orders(event_id);
CREATE INDEX idx_orders_statut ON orders(statut);
CREATE INDEX idx_tickets_order_id ON tickets(order_id);
CREATE INDEX idx_tickets_ticket_type_id ON tickets(ticket_type_id);
CREATE INDEX idx_payouts_organisateur_id ON payouts(organisateur_id);
CREATE INDEX idx_payouts_statut ON payouts(statut);

-- ========================================
-- 3. TRIGGERS
-- ========================================

-- Trigger: Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, nom, telephone, role)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'nom', new.email), NULL, 'visiteur');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- ========================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- ========================================
-- POLICIES: profiles
-- ========================================

-- Anonymous can read profiles (public info)
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin can update any profile
CREATE POLICY "Admin can update any profile"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ========================================
-- POLICIES: events
-- ========================================

-- Anyone can read published events
CREATE POLICY "Published events are readable by everyone"
  ON events FOR SELECT
  USING (statut = 'publie');

-- Organisateurs can read their own events (draft, validation, etc)
CREATE POLICY "Organisateurs can read their own events"
  ON events FOR SELECT
  USING (organisateur_id = auth.uid());

-- Admin can read all events
CREATE POLICY "Admin can read all events"
  ON events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only organisateurs can insert events
CREATE POLICY "Organisateurs can insert events"
  ON events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('organisateur', 'admin')
    )
    AND organisateur_id = auth.uid()
  );

-- Organisateurs can update/delete their own events
CREATE POLICY "Organisateurs can update their own events"
  ON events FOR UPDATE
  USING (organisateur_id = auth.uid())
  WITH CHECK (organisateur_id = auth.uid());

CREATE POLICY "Organisateurs can delete their own events"
  ON events FOR DELETE
  USING (organisateur_id = auth.uid());

-- Admin can update/delete any event
CREATE POLICY "Admin can update any event"
  ON events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can delete any event"
  ON events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ========================================
-- POLICIES: ticket_types
-- ========================================

-- Anyone can read ticket types of published events
CREATE POLICY "Ticket types of published events are readable"
  ON ticket_types FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events WHERE id = event_id AND statut = 'publie'
    )
  );

-- Organisateurs can read ticket types of their events
CREATE POLICY "Organisateurs can read ticket types of their events"
  ON ticket_types FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_id AND organisateur_id = auth.uid()
    )
  );

-- Admin can read all ticket types
CREATE POLICY "Admin can read all ticket types"
  ON ticket_types FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Organisateurs can insert/update/delete ticket types for their events (SERVER ONLY via trigger)
CREATE POLICY "Organisateurs can insert ticket types"
  ON ticket_types FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Organisateurs can update ticket types"
  ON ticket_types FOR UPDATE
  USING (false);

CREATE POLICY "Organisateurs can delete ticket types"
  ON ticket_types FOR DELETE
  USING (false);

-- ========================================
-- POLICIES: orders (SERVER ONLY - NO ANON KEY)
-- ========================================

-- Users can read their own orders
CREATE POLICY "Users can read their own orders"
  ON orders FOR SELECT
  USING (user_id = auth.uid());

-- Organisateurs can read orders for their events
CREATE POLICY "Organisateurs can read orders for their events"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events WHERE id = event_id AND organisateur_id = auth.uid()
    )
  );

-- Admin can read all orders
CREATE POLICY "Admin can read all orders"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Block all writes via anon key
CREATE POLICY "Block insert orders via anon"
  ON orders FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Block update orders via anon"
  ON orders FOR UPDATE
  USING (false);

CREATE POLICY "Block delete orders via anon"
  ON orders FOR DELETE
  USING (false);

-- ========================================
-- POLICIES: tickets (SERVER ONLY - NO ANON KEY)
-- ========================================

-- Users can read their own tickets
CREATE POLICY "Users can read their own tickets"
  ON tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders WHERE id = order_id AND user_id = auth.uid()
    )
  );

-- Organisateurs can read tickets for their events
CREATE POLICY "Organisateurs can read tickets for their events"
  ON tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN events e ON o.event_id = e.id
      WHERE o.id = order_id AND e.organisateur_id = auth.uid()
    )
  );

-- Admin can read all tickets
CREATE POLICY "Admin can read all tickets"
  ON tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Block all writes via anon key
CREATE POLICY "Block insert tickets via anon"
  ON tickets FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Block update tickets via anon"
  ON tickets FOR UPDATE
  USING (false);

CREATE POLICY "Block delete tickets via anon"
  ON tickets FOR DELETE
  USING (false);

-- ========================================
-- POLICIES: payouts (SERVER ONLY - NO ANON KEY)
-- ========================================

-- Organisateurs can read their own payouts
CREATE POLICY "Organisateurs can read their own payouts"
  ON payouts FOR SELECT
  USING (organisateur_id = auth.uid());

-- Admin can read all payouts
CREATE POLICY "Admin can read all payouts"
  ON payouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Block all writes via anon key
CREATE POLICY "Block insert payouts via anon"
  ON payouts FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Block update payouts via anon"
  ON payouts FOR UPDATE
  USING (false);

CREATE POLICY "Block delete payouts via anon"
  ON payouts FOR DELETE
  USING (false);
