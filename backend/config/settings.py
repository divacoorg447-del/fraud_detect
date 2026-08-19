import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://wmbgybbuvmmpgbsbcass.supabase.co")
# Fallback to SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY (used for frontend/read-only ops)
SUPABASE_KEY = os.getenv("SUPABASE_KEY", os.getenv("SUPABASE_ANON_KEY", os.getenv("VITE_SUPABASE_ANON_KEY", "sb_publishable_8mCuvA5dvwb1NiZWR6mkMw_CyI8YYBt")))
# Service Role Key — bypasses RLS; used for trusted backend INSERT/UPDATE operations
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "8b5e2d0c4c9f1a7e5d8b3f0a9c6e1d4f7a2b5c8d9e0f1a3b6c7d8e9f0a1b2c3")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

# AI Copilot Ollama Models
DEFAULT_CHAT_MODEL = os.getenv("DEFAULT_CHAT_MODEL", "gemma3:4b")
IMAGE_ANALYSIS_MODEL = os.getenv("IMAGE_ANALYSIS_MODEL", "qwen2.5vl:3b")

