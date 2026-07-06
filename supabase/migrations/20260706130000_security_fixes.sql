-- Supabase SQL Migration: Security fixes for xwezanevent
-- Date: 2026-07-06
-- Fixes: Role escalation, auto-publication, privacy, updated_at triggers

-- ========================================
-- 1. FIX: ESCALADE DE RÔLE - Prevent role column modification via client
-- ========================================

-- Trigger to prevent unauthorized role changes
-- SECURITY INVOKER: current_user returns the actual caller, not the function owner
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only postgres/rls_bypass_role users can modify role
  -- For authenticated users via service_role: current_user will be service_role
  IF current_user NOT IN ('postgres', 'service_role') THEN
    -- Block role changes for all other users (authenticated clients)
    IF NEW.role != OLD.role THEN
      RAISE EXCEPTION 'Unauthorized: role can only be changed by administrators';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Create trigger on profiles to validate updates
DROP TRIGGER IF EXISTS validate_profile_update_trigger ON profiles;
CREATE TRIGGER validate_profile_update_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE PROCEDURE prevent_role_escalation();

-- Update the policy to be more explicit
-- Drop old policy
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- New policy: Users can update their own profile (role change blocked by trigger)
CREATE POLICY "Users can update own profile info"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ========================================
-- 2. FIX: AUTO-PUBLICATION - Restrict status changes to service_role only
-- ========================================

-- Trigger to prevent unauthorized event status changes
-- SECURITY INVOKER: current_user returns the actual caller, not the function owner
CREATE OR REPLACE FUNCTION prevent_unauthorized_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow service_role and postgres to change status freely
  IF current_user IN ('service_role', 'postgres') THEN
    RETURN NEW;
  END IF;
  
  -- For authenticated users: only allow brouillon -> en_validation transition
  IF OLD.statut != NEW.statut THEN
    IF OLD.statut = 'brouillon' AND NEW.statut = 'en_validation' THEN
      RETURN NEW;  -- Allow this transition
    ELSE
      RAISE EXCEPTION 'Unauthorized: only brouillon→en_validation allowed. Other transitions require administrator approval';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Create trigger on events to validate status changes
DROP TRIGGER IF EXISTS prevent_event_status_change ON events;
CREATE TRIGGER prevent_event_status_change
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE PROCEDURE prevent_unauthorized_status_change();

-- ========================================
-- 3. FIX: VIE PRIVÉE - Restrict profiles phone number from public view
-- ========================================

-- Drop old overly-permissive policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

-- Policy: Everyone can read public columns (id, nom, role, created_at)
-- Authentication check happens at column level
CREATE POLICY "Profiles public info readable"
  ON profiles FOR SELECT
  USING (true);

-- Note: Column-level SELECT restrictions are enforced via PostgreSQL column privileges.
-- This must be applied AFTER RLS is enabled.

-- Revoke all SELECT on profiles from public/anonymous roles initially
REVOKE SELECT ON profiles FROM public;
REVOKE SELECT ON profiles FROM anon;  -- Supabase anon role

-- Grant SELECT only on safe columns to anonymous/public
GRANT SELECT (id, nom, role, created_at) ON profiles TO anon;
GRANT SELECT (id, nom, role, created_at) ON profiles TO public;

-- Authenticated users can read public columns + full access to own profile via RLS
GRANT SELECT (id, nom, role, created_at, telephone, updated_at) ON profiles TO authenticated;

-- Service role has full access
GRANT SELECT ON profiles TO service_role;

-- Add policy for users to read their own complete profile
CREATE POLICY "Users can read own full profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- ========================================
-- 4. FIX: UPDATED_AT - Add automatic timestamp update to all tables
-- ========================================

-- Generic function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at column
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_ticket_types_updated_at ON ticket_types;
CREATE TRIGGER update_ticket_types_updated_at
  BEFORE UPDATE ON ticket_types
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_tickets_updated_at ON tickets;
CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_payouts_updated_at ON payouts;
CREATE TRIGGER update_payouts_updated_at
  BEFORE UPDATE ON payouts
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- ========================================
-- 5. FIX: Allow 'termine' status in public event view
-- ========================================

-- Drop old policy that only allows 'publie'
DROP POLICY IF EXISTS "Published events are readable by everyone" ON events;

-- New policy: Public can read published and terminated events
CREATE POLICY "Published and terminated events readable"
  ON events FOR SELECT
  USING (statut IN ('publie', 'termine'));

-- Keep existing policies for organisators and admin
-- (They are already defined in the original migration)
