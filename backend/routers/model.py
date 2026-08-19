import os
import json
import pandas as pd
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from backend.utils.security import get_current_user
from backend.database.connection import supabase
from backend.services.dataset_manager import DatasetManager
from backend.training.pipeline import run_comparison_pipeline, load_registry, MODELS_DIR

router = APIRouter(prefix="/api/models", tags=["models"])

# Global state to track active model type
ACTIVE_MODEL_TYPE = "xgboost"

def background_train_task(dataset_id: str, hyperparams: dict):
    try:
        run_comparison_pipeline(dataset_id, hyperparams)
    except Exception as e:
        print(f"Background training failed for dataset {dataset_id}: {e}")

@router.get("/datasets")
def list_available_datasets(current_user = Depends(get_current_user)):
    """Lists all available datasets by scanning the raw/ directory."""
    dm = DatasetManager()
    datasets = dm.scan_datasets()
    # Return list of dataset IDs (e.g. ['ieee-cis', 'paysim'])
    return [ds["id"] for ds in datasets]

@router.get("/datasets/{dataset_id}/stats")
def get_dataset_stats(dataset_id: str, current_user = Depends(get_current_user)):
    """Retrieves statistical metadata for the selected dataset."""
    dm = DatasetManager()
    try:
        return dm.get_dataset_stats(dataset_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/registry")
def get_model_registry(current_user = Depends(get_current_user)):
    """Returns details of all trained models."""
    return load_registry()

@router.post("/train")
def train_model(
    model_type: str, 
    background_tasks: BackgroundTasks,
    dataset_name: str = "ieee-cis",
    hyperparams: str = "{}", 
    current_user = Depends(get_current_user)
):
    """Triggers background full benchmark & training for all 5 models using the selected dataset."""
    try:
        h_dict = json.loads(hyperparams)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid hyperparams JSON format.")
        
    background_tasks.add_task(background_train_task, dataset_name, h_dict)
    return {
        "status": "TRAINING_STARTED", 
        "model_type": model_type, 
        "message": f"Training comparison pipeline initiated in background for dataset {dataset_name}. All 5 models are being benchmarked."
    }

@router.post("/activate")
def activate_model(model_type: str, current_user = Depends(get_current_user)):
    """Sets the active model to be used during CSV prediction uploads."""
    registry = load_registry()
    if model_type not in registry:
        raise HTTPException(status_code=400, detail=f"Model {model_type} has not been trained yet. Please train it first.")
        
    global ACTIVE_MODEL_TYPE
    ACTIVE_MODEL_TYPE = model_type
    
    # Update active model in registry JSON
    for k in registry:
        registry[k]["active"] = (k == model_type)
    
    # Save active model status
    from backend.training.pipeline import save_registry
    save_registry(registry)
    
    return {"status": "SUCCESS", "active_model": model_type}
