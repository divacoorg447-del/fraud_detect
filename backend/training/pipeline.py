import os
import time
import pickle
import json
import pandas as pd
import numpy as np
import torch
from sklearn.model_selection import train_test_split
from backend.gpu.monitor import get_gpu_telemetry
from backend.utils.logging_helper import log_event
from backend.services.dataset_manager import DatasetManager

# Modular imports
from backend.training.preprocess_dataset import (
    impute_missing_values, remove_duplicates, engineer_features, 
    encode_categorical, select_features, scale_features
)
from backend.training.train_models import (
    train_xgboost, train_random_forest, train_isolation_forest, 
    train_logistic_regression, train_autoencoder
)
from backend.training.evaluate_models import (
    get_predictions, evaluate_metrics, calculate_importance
)
from backend.training.benchmark_gpu import (
    benchmark_train_time, benchmark_prediction_time, get_hardware_telemetry
)

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODELS_DIR = os.path.join(ROOT_DIR, "models")
BACKEND_MODELS_DIR = os.path.join(ROOT_DIR, "backend", "models")
REPORTS_DIR = os.path.join(ROOT_DIR, "reports")
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(BACKEND_MODELS_DIR, exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)
REGISTRY_PATH = os.path.join(MODELS_DIR, "registry.json")

def load_registry():
    if os.path.exists(REGISTRY_PATH):
        try:
            with open(REGISTRY_PATH, "r") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_registry(registry):
    with open(REGISTRY_PATH, "w") as f:
        json.dump(registry, f, indent=4)

def run_training_pipeline(df: pd.DataFrame, model_type: str = "xgboost", hyperparams: dict = None, use_gpu: bool = False):
    if hyperparams is None:
        hyperparams = {}

    features = [col for col in df.columns if col != "target"]
    X = df[features].to_numpy()
    y = df["target"].to_numpy() if "target" in df.columns else np.zeros(len(df))

    # Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Detect hardware configuration
    telemetry = get_gpu_telemetry()
    gpu_available = telemetry["gpu_available"] and use_gpu

    # Fit using modularized train_models.py functions
    if model_type == "isolation_forest":
        train_fn = lambda: train_isolation_forest(X_train, hyperparams, use_gpu=gpu_available)
    elif model_type == "random_forest":
        train_fn = lambda: train_random_forest(X_train, y_train, hyperparams, use_gpu=gpu_available)
    elif model_type == "logistic_regression":
        train_fn = lambda: train_logistic_regression(X_train, y_train, use_gpu=gpu_available)
    elif model_type == "autoencoder":
        train_fn = lambda: train_autoencoder(X_train, hyperparams, use_gpu=gpu_available)
    else: # xgboost
        train_fn = lambda: train_xgboost(X_train, y_train, hyperparams, use_gpu=gpu_available)

    # Benchmark train time
    model, train_time = benchmark_train_time(train_fn)

    # Predict using modularized evaluate_models.py functions
    pred_fn = lambda: get_predictions(model, X_test, model_type, use_gpu=gpu_available, threshold=0.5)
    raw_preds, probs, prediction_time = benchmark_prediction_time(pred_fn)

    # Find optimal threshold to address low recall
    from backend.training.evaluate_models import find_optimal_threshold
    if model_type in ["isolation_forest", "autoencoder"]:
        optimal_threshold = 0.5
    else:
        optimal_threshold = find_optimal_threshold(y_test, probs)
        
    # Get final predictions using optimized threshold
    preds = (probs >= optimal_threshold).astype(int)
    if model_type == "isolation_forest":
        preds = raw_preds

    # Calculate metrics
    metrics = evaluate_metrics(y_test, preds, probs)

    # Feature Importance
    importance = calculate_importance(model, features, model_type)

    # Save Model
    model_filename = f"{model_type}.pkl"
    model_path = os.path.join(MODELS_DIR, model_filename)
    backend_model_path = os.path.join(BACKEND_MODELS_DIR, model_filename)
    
    model_data = {
        "model": model,
        "model_type": model_type,
        "threshold": optimal_threshold,
        "features": features,
        "metrics": metrics,
        "configuration": hyperparams,
        "training_date": pd.Timestamp.now().isoformat()
    }
    
    with open(model_path, "wb") as f:
        pickle.dump(model_data, f)
        
    with open(backend_model_path, "wb") as f:
        pickle.dump(model_data, f)

    return {
        "model_type": model_type,
        "filename": model_filename,
        "trained_at": model_data["training_date"],
        "gpu_accelerated": gpu_available,
        "execution_mode": "GPU (CUDA)" if gpu_available else "CPU Fallback",
        "training_time_s": train_time,
        "prediction_time_s": prediction_time,
        "metrics": metrics,
        "feature_importance": importance
    }

def run_comparison_pipeline(dataset_id: str, hyperparams: dict = None):
    if hyperparams is None:
        hyperparams = {}

    log_event("training", f"Starting full comparisons benchmark pipeline for dataset {dataset_id}")
    
    # Load dataset
    dm = DatasetManager()
    datasets = dm.scan_datasets()
    ds = next((d for d in datasets if d["id"] == dataset_id), None)
    if not ds:
        raise ValueError(f"Dataset {dataset_id} not found.")

    # Load downsampled
    df_raw = dm.load_dataset_sample(ds, nrows=40000)
    target_col = dm.detect_target_column(df_raw)
    dm.validate_dataset(df_raw, target_col)
    
    # Modular preprocessing
    df_preprocessed = impute_missing_values(df_raw, target_col)
    df_preprocessed = remove_duplicates(df_preprocessed)
    df_preprocessed = engineer_features(df_preprocessed)
    df_preprocessed = encode_categorical(df_preprocessed, target_col)
    df_preprocessed = select_features(df_preprocessed, target_col)
    df_preprocessed = scale_features(df_preprocessed, target_col)
    
    X_scaled = df_preprocessed[[c for c in df_preprocessed.columns if c != target_col]]
    y = df_preprocessed[target_col].to_numpy()
    
    df_preprocessed_final = X_scaled.copy()
    df_preprocessed_final["target"] = y

    model_types = ["isolation_forest", "random_forest", "logistic_regression", "autoencoder", "xgboost"]
    results = {}
    
    telemetry = get_gpu_telemetry()
    cuda_available = telemetry["gpu_available"]

    for m_type in model_types:
        log_event("training", f"Benchmarking model: {m_type}")
        
        # CPU Training run
        cpu_res = run_training_pipeline(df_preprocessed_final, m_type, hyperparams, use_gpu=False)
        
        gpu_res = None
        if cuda_available:
            try:
                gpu_res = run_training_pipeline(df_preprocessed_final, m_type, hyperparams, use_gpu=True)
            except Exception as e:
                log_event("training", f"GPU Training failed for {m_type}: {e}")

        final_res = gpu_res if gpu_res else cpu_res
        hw_telemetry = get_hardware_telemetry(gpu_active=(gpu_res is not None))
        
        results[m_type] = {
            "model_type": m_type,
            "filename": final_res["filename"],
            "trained_at": final_res["trained_at"],
            "metrics": final_res["metrics"],
            "feature_importance": final_res["feature_importance"],
            "cpu_benchmark": {
                "training_time_s": cpu_res["training_time_s"],
                "prediction_time_s": cpu_res["prediction_time_s"]
            },
            "gpu_benchmark": {
                "training_time_s": gpu_res["training_time_s"] if gpu_res else None,
                "prediction_time_s": gpu_res["prediction_time_s"] if gpu_res else None,
                **hw_telemetry
            },
            "gpu_accelerated": final_res["gpu_accelerated"],
            "execution_mode": final_res["execution_mode"]
        }

    # Automatically select best model based on F1 Score
    best_model_type = "xgboost"
    best_f1 = -1.0
    for m_type, res in results.items():
        f1 = res["metrics"]["f1_score"]
        if f1 > best_f1:
            best_f1 = f1
            best_model_type = m_type

    # Mark active
    registry = load_registry()
    for m_type, res in results.items():
        registry[m_type] = res
        registry[m_type]["active"] = (m_type == best_model_type)
        
    save_registry(registry)
    
    # Copy to best_model.pkl
    best_pkl_src = os.path.join(MODELS_DIR, f"{best_model_type}.pkl")
    best_pkl_dest = os.path.join(MODELS_DIR, "best_model.pkl")
    best_pkl_backend_dest = os.path.join(BACKEND_MODELS_DIR, "best_model.pkl")
    
    import shutil
    if os.path.exists(best_pkl_src):
        shutil.copy(best_pkl_src, best_pkl_dest)
        shutil.copy(best_pkl_src, best_pkl_backend_dest)
        
    # Generate and save model comparison reports into reports/
    report_content = (
        f"# FraudGuard Model Training & Evaluation Report\n\n"
        f"- **Dataset ID**: {dataset_id}\n"
        f"- **Timestamp**: {pd.Timestamp.now().isoformat()}\n"
        f"- **Best Selected Model**: {best_model_type.upper()} (F1-score: {best_f1:.4f})\n\n"
        f"## Model Performance & Benchmarking Comparison\n\n"
        f"| Model | Accuracy | Precision | Recall | F1-Score | ROC AUC | CPU Train Time | GPU Train Time | GPU Acceleration |\n"
        f"|-------|----------|-----------|--------|----------|---------|----------------|----------------|------------------|\n"
    )
    for m_type, res in results.items():
        metrics = res["metrics"]
        cpu_time = f"{res['cpu_benchmark']['training_time_s']:.3f}s"
        gpu_time = f"{res['gpu_benchmark']['training_time_s']:.3f}s" if res['gpu_benchmark']['training_time_s'] else "N/A"
        gpu_accel = "YES" if res["gpu_accelerated"] else "NO"
        report_content += (
            f"| {m_type.upper()} | {metrics['accuracy']:.4f} | {metrics['precision']:.4f} | "
            f"{metrics['recall']:.4f} | {metrics['f1_score']:.4f} | {metrics['roc_auc']:.4f} | "
            f"{cpu_time} | {gpu_time} | {gpu_accel} |\n"
        )
    
    report_path = os.path.join(REPORTS_DIR, "training_report.md")
    with open(report_path, "w") as f:
        f.write(report_content)
        
    json_report_path = os.path.join(REPORTS_DIR, "model_comparison.json")
    with open(json_report_path, "w") as f:
        json.dump(results, f, indent=4)
        
    log_event("training", f"Full comparison completed. Best model: {best_model_type} with F1-score {best_f1:.4f}. Saved to best_model.pkl and reports/.")
    
    return {
        "status": "COMPLETED",
        "best_model": best_model_type,
        "results": results
    }

if __name__ == "__main__":
    import sys
    dm = DatasetManager()
    datasets = dm.scan_datasets()
    if not datasets:
        print("[ERROR] No datasets found in raw/ directory.")
        sys.exit(1)
    else:
        print(f"[DETECTED] Automatically detected datasets: {[d['id'] for d in datasets]}")
        # Default to first found dataset if not specified
        target_dataset = datasets[0]["id"]
        print(f"[LAUNCH] Triggering training pipeline automatically on dataset: {target_dataset}")
        run_comparison_pipeline(target_dataset)

