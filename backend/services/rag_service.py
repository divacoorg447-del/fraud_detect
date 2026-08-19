import os
import json
import pandas as pd
from backend.database.connection import supabase
from backend.gpu.embeddings import get_text_embedding, cosine_similarity
from backend.training.pipeline import load_registry
from backend.gpu.monitor import get_gpu_telemetry

def get_rag_context(query: str, embedding_model: str = "nomic-embed-text") -> str:
    """
    Builds context chunks from predictions, model registry, upload logs, and GPU status,
    embbeds them, and returns the top 5 most similar chunks relative to the query.
    """
    chunks = []
    
    # 1. Fetch prediction records
    try:
        res = supabase.table("predictions").select("*").limit(60).execute()
        records = res.data or []
        for r in records:
            # Short descriptive summaries
            chunks.append(
                f"Case dossier: ID {r.get('id')} for beneficiary '{r.get('name')}' (phone {r.get('phone')}, state {r.get('state')}). "
                f"Flagged under scheme '{r.get('scheme')}' with risk score {r.get('risk_score')}% and {r.get('severity')} severity. "
                f"Status: {r.get('status')}. Assigned to: {r.get('assigned_to')}. Notes: {r.get('officer_notes') or 'None'}. "
                f"Model used: {r.get('model_used') or 'N/A'}. Execution mode: {r.get('execution_mode') or 'N/A'}."
            )
    except Exception as e:
        print(f"RAG Predictions query fail: {e}")
        
    # 2. Fetch upload logs
    try:
        res = supabase.table("uploads").select("*").limit(10).execute()
        uploads = res.data or []
        for u in uploads:
            chunks.append(
                f"Dataset log: File '{u.get('filename')}' with {u.get('record_count')} transactions was processed "
                f"at {u.get('created_at')}."
            )
    except Exception:
        pass
        
    # 3. Model registry metrics
    try:
        registry = load_registry()
        for name, info in registry.items():
            metrics = info.get("metrics", {})
            chunks.append(
                f"ML Model: Type '{name.upper()}' trained at {info.get('trained_at')} in {info.get('training_time_s')}s. "
                f"Execution mode: {info.get('execution_mode')}. Metrics: Accuracy {metrics.get('accuracy')}, "
                f"Precision {metrics.get('precision')}, Recall {metrics.get('recall')}, F1-score {metrics.get('f1_score')}, "
                f"ROC AUC {metrics.get('roc_auc')}."
            )
    except Exception:
        pass
        
    # 4. GPU Telemetry
    try:
        gpu = get_gpu_telemetry()
        chunks.append(
            f"NVIDIA Hardware Status: GPU Available: {gpu.get('gpu_available')}, Name: '{gpu.get('name')}', "
            f"CUDA: '{gpu.get('cuda_version')}', VRAM: {gpu.get('vram_used')}/{gpu.get('vram_total')} MB, "
            f"Utilization: {gpu.get('utilization')}%, Temperature: {gpu.get('temperature')}°C."
        )
    except Exception:
        pass

    if not chunks:
        return "No system case files or telemetry records found in the database."

    # Compute query embedding
    query_emb = get_text_embedding(query, embedding_model)
    
    # Match similarities
    matched = []
    for chunk in chunks:
        chunk_emb = get_text_embedding(chunk, embedding_model)
        sim = cosine_similarity(query_emb, chunk_emb)
        matched.append((chunk, sim))
        
    # Sort and take top 5
    matched.sort(key=lambda x: x[1], reverse=True)
    top_chunks = [m[0] for m in matched[:5]]
    
    return "\n\n".join(top_chunks)
