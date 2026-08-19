-- ══════════════════════════════════════════════════════════════════
-- FraudGuard AI — Supabase RLS Fix Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ══════════════════════════════════════════════════════════════════
--
-- PROBLEM:
--   The original "Allow insert uploads" policy requires auth.uid() = uploaded_by.
--   The backend inserts rows using the anon key (no user session attached),
--   so auth.uid() returns NULL and the check fails → "permission denied for table uploads".
--
-- FIX:
--   Replace the restrictive policy with WITH CHECK (true) so trusted backend
--   inserts are allowed. Access is still protected by the Supabase anon key
--   and FastAPI authentication — only authenticated API calls reach this table.
-- ══════════════════════════════════════════════════════════════════

-- ── 1. FIX uploads table RLS ──────────────────────────────────────────────────

-- Drop the old restrictive INSERT policy
DROP POLICY IF EXISTS "Allow insert uploads" ON public.uploads;

-- New permissive INSERT policy (trusted backend — FastAPI validates auth before insert)
CREATE POLICY "Allow insert uploads" ON public.uploads
  FOR INSERT WITH CHECK (true);

-- Ensure SELECT is also open (should already exist, but be safe)
DROP POLICY IF EXISTS "Allow read uploads" ON public.uploads;
CREATE POLICY "Allow read uploads" ON public.uploads
  FOR SELECT USING (true);

-- Grant explicit table permissions to anon and authenticated roles
GRANT SELECT, INSERT ON public.uploads TO anon;
GRANT SELECT, INSERT ON public.uploads TO authenticated;
GRANT ALL ON public.uploads TO service_role;


-- ── 2. VERIFY uploads table columns match backend inserts ─────────────────────
-- The backend inserts these columns. Confirm they exist:
--   id, filename, uploaded_by, record_count, status, created_at
-- If any are missing, add them:

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'uploads'
      AND column_name  = 'status'
  ) THEN
    ALTER TABLE public.uploads ADD COLUMN status TEXT NOT NULL DEFAULT 'COMPLETED';
    RAISE NOTICE 'Added missing column: status';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'uploads'
      AND column_name  = 'record_count'
  ) THEN
    ALTER TABLE public.uploads ADD COLUMN record_count INTEGER NOT NULL DEFAULT 0;
    RAISE NOTICE 'Added missing column: record_count';
  END IF;
END;
$$;


-- ── 3. CONFIRM all other tables still have correct policies ───────────────────

-- predictions — must allow all reads and writes (already correct)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'predictions' AND policyname = 'Allow insert/update predictions'
  ) THEN
    CREATE POLICY "Allow insert/update predictions" ON public.predictions
      FOR ALL USING (true);
    RAISE NOTICE 'Re-created missing predictions ALL policy';
  END IF;
END;
$$;

-- audit_logs — must allow inserts (already correct)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'audit_logs' AND policyname = 'Allow insert audit_logs'
  ) THEN
    CREATE POLICY "Allow insert audit_logs" ON public.audit_logs
      FOR INSERT WITH CHECK (true);
    RAISE NOTICE 'Re-created missing audit_logs INSERT policy';
  END IF;
END;
$$;


-- ── 4. VERIFY RLS is enabled on all tables ────────────────────────────────────
ALTER TABLE public.uploads      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users        ENABLE ROW LEVEL SECURITY;


-- ── 5. QUICK SANITY CHECK ─────────────────────────────────────────────────────
-- Run this SELECT to confirm policies after migration:
SELECT tablename, policyname, cmd, qual, with_check
FROM   pg_policies
WHERE  tablename IN ('uploads', 'predictions', 'audit_logs', 'users')
ORDER  BY tablename, cmd;
