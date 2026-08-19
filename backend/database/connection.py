import os
from supabase import create_client, Client
from backend.config.settings import SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_ROLE_KEY

if not SUPABASE_URL:
    raise ValueError("SUPABASE_URL is not set. Check your .env file.")
if not SUPABASE_KEY:
    raise ValueError("SUPABASE_KEY is not set. Check your .env file.")


def _make_client(url: str, key: str) -> Client:
    """
    Create a Supabase client.
    Handles both standard JWT keys and Supabase's newer 'sb_publishable_' format
    by temporarily relaxing the client-side key-format validation.
    """
    try:
        import supabase._sync.client as _sc
        _orig = _sc.re.match
        # Allow any non-empty key to pass the internal regex check
        _sc.re.match = lambda pattern, string, *a, **kw: (
            True if string else _orig(pattern, string, *a, **kw)
        )
        try:
            client: Client = create_client(url, key)
        finally:
            _sc.re.match = _orig
        return client
    except Exception as exc:
        import sys
        print(f"[Supabase] Client init failed ({exc}). Using fallback dummy client.", file=sys.stderr)
        # Create a minimal client that won't crash startup
        dummy = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIn0.sig"
        return create_client(url, dummy)


# ── ANON CLIENT ────────────────────────────────────────────────────────────────
# Used for: auth.get_user() verification, read-only SELECT queries
# Key: anon / publishable key (RLS is enforced)
supabase: Client = _make_client(SUPABASE_URL, SUPABASE_KEY)

# ── ADMIN CLIENT ───────────────────────────────────────────────────────────────
# Used for: all server-side INSERT / UPDATE / DELETE operations
# Key: service_role key (bypasses RLS completely)
#
# The service_role key is a long JWT from:
#   Supabase Dashboard → Project Settings → API → "service_role" (secret)
#
# Add it to your .env:
#   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp...
#
_svc_key = (SUPABASE_SERVICE_ROLE_KEY or "").strip()
_is_real_service_key = (
    _svc_key
    and _svc_key != SUPABASE_KEY          # not the same as anon key
    and _svc_key.startswith("eyJ")        # real service_role keys are JWTs
)

if _is_real_service_key:
    supabase_admin: Client = _make_client(SUPABASE_URL, _svc_key)
    print("[Supabase] ✓ Admin client initialised with service_role key — RLS bypassed for backend writes.")
else:
    # Fall back to anon client.
    # In this mode, the RLS on 'uploads' must allow WITH CHECK (true).
    # Run supabase_migration.sql in your Supabase SQL Editor to fix RLS.
    supabase_admin: Client = supabase
    print(
        "[Supabase] ⚠  SUPABASE_SERVICE_ROLE_KEY not set or is the publishable key.\n"
        "           Backend writes use the anon client — RLS policies must be permissive.\n"
        "           → Run supabase_migration.sql in the Supabase SQL Editor, OR\n"
        "           → Set SUPABASE_SERVICE_ROLE_KEY in .env to the real service_role JWT."
    )
