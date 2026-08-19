import httpx
import json
import asyncio

OLLAMA_BASE_URL = "http://localhost:11434"

def check_ollama_online() -> bool:
    """Checks if the local Ollama instance is active and reachable."""
    try:
        r = httpx.get(f"{OLLAMA_BASE_URL}/", timeout=1.0)
        return r.status_code == 200
    except Exception:
        return False

def list_installed_models():
    """Queries local Ollama instance to list installed model names and parameters."""
    if not check_ollama_online():
        return []
    try:
        r = httpx.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=3.0)
        if r.status_code == 200:
            models_data = r.json().get("models", [])
            formatted = []
            for m in models_data:
                details = m.get("details", {})
                formatted.append({
                    "name": m.get("name"),
                    "size_bytes": m.get("size", 0),
                    "family": details.get("family", "N/A"),
                    "parameter_size": details.get("parameter_size", "N/A"),
                    "quantization_level": details.get("quantization_level", "N/A")
                })
            return formatted
    except Exception as e:
        print(f"Error querying Ollama models: {e}")
    return []

async def pull_model_task(model_name: str):
    """Pulls a model in the background using Ollama API stream reader."""
    try:
        async with httpx.AsyncClient(timeout=600.0) as client:
            async with client.stream("POST", f"{OLLAMA_BASE_URL}/api/pull", json={"name": model_name}) as response:
                async for line in response.iter_lines():
                    if line:
                        try:
                            # Print progress updates in console
                            progress = json.loads(line)
                            status = progress.get("status")
                            completed = progress.get("completed", 0)
                            total = progress.get("total", 0)
                            pct = f"({round(completed/total*100, 1)}%)" if total else ""
                            print(f"[Ollama Pull] {model_name}: {status} {pct}")
                        except Exception:
                            pass
    except Exception as e:
        print(f"Failed to pull model {model_name}: {e}")

def delete_model(model_name: str) -> bool:
    """Deletes an installed model from local Ollama disk space."""
    if not check_ollama_online():
        return False
    try:
        r = httpx.request("DELETE", f"{OLLAMA_BASE_URL}/api/delete", json={"name": model_name})
        return r.status_code == 200
    except Exception as e:
        print(f"Failed to delete model {model_name}: {e}")
        return False

async def get_chat_response_stream(model_name: str, messages: list, temperature: float = 0.2):
    """
    Streams chat completion chunks back to the client.
    Automatically injects parameters to optimize for local NVIDIA GPU cards.
    """
    payload = {
        "model": model_name,
        "messages": messages,
        "options": {
            "temperature": temperature,
            "num_gpu": 1, # Direct request to load parameters into active VRAM
            "num_ctx": 4096 # Set default context window
        },
        "stream": True
    }
    
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", f"{OLLAMA_BASE_URL}/api/chat", json=payload) as response:
                async for line in response.iter_lines():
                    if line:
                        try:
                            chunk = json.loads(line)
                            content = chunk.get("message", {}).get("content", "")
                            done = chunk.get("done", False)
                            
                            # Read execution metrics if generation is finished
                            metrics = {}
                            if done:
                                metrics = {
                                    "eval_count": chunk.get("eval_count"),
                                    "eval_duration": chunk.get("eval_duration"),
                                    "load_duration": chunk.get("load_duration"),
                                    "total_duration": chunk.get("total_duration")
                                }
                            
                            yield json.dumps({"content": content, "done": done, "metrics": metrics})
                        except Exception:
                            pass
    except Exception as e:
        yield json.dumps({"error": f"Streaming connection failed: {str(e)}", "done": True})
