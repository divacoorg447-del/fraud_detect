import numpy as np
import httpx
from backend.config.settings import DEFAULT_CHAT_MODEL

OLLAMA_BASE_URL = "http://localhost:11434"

def get_text_embedding(text: str, model_name: str = "nomic-embed-text") -> list:
    """
    Computes a vector embedding for the input text using local Ollama.
    Falls back to a basic term-frequency vector representation if offline or model is missing.
    """
    # 1. Attempt Ollama nomic embedding
    try:
        payload = {"model": model_name, "prompt": text}
        r = httpx.post(f"{OLLAMA_BASE_URL}/api/embeddings", json=payload, timeout=3.0)
        if r.status_code == 200:
            return r.json().get("embedding", [])
    except Exception:
        pass

    # 2. Try falling back to another common model if nomic isn't pulled
    try:
        # Fallback to LLM embedding capability directly
        payload = {"model": DEFAULT_CHAT_MODEL, "prompt": text}
        r = httpx.post(f"{OLLAMA_BASE_URL}/api/embeddings", json=payload, timeout=3.0)
        if r.status_code == 200:
            return r.json().get("embedding", [])
    except Exception:
        pass

    # 3. Fallback: Hash-based Term-Frequency vector mapping (384 dimensions)
    words = text.lower().split()
    vector = np.zeros(384)
    for word in words:
        idx = hash(word) % 384
        vector[idx] += 1.0
    
    norm = np.linalg.norm(vector)
    if norm > 0:
        vector = vector / norm
        
    return vector.tolist()

def cosine_similarity(v1: list, v2: list) -> float:
    """Calculates cosine similarity between two numeric vectors."""
    a = np.array(v1)
    b = np.array(v2)
    if a.size == 0 or b.size == 0:
        return 0.0
    dot = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot / (norm_a * norm_b))
