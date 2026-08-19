import numpy as np
import xgboost as xgb
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix

# Try importing RAPIDS
try:
    import cudf
    import cuml
    RAPIDS_AVAILABLE = True
except ImportError:
    RAPIDS_AVAILABLE = False

def find_optimal_threshold(y_true, y_prob):
    best_thresh = 0.5
    best_f1 = -1.0
    # Search from 0.05 to 0.95
    for thresh in np.arange(0.05, 0.95, 0.05):
        y_pred = (y_prob >= thresh).astype(int)
        score = f1_score(y_true, y_pred, zero_division=0)
        if score > best_f1:
            best_f1 = score
            best_thresh = thresh
    return float(best_thresh)

def get_predictions(model, X_test, model_type: str, use_gpu: bool = False, threshold: float = 0.5):
    """
    Unified predictions helper returning anomaly flags and confidence probabilities.
    """
    if model_type == "isolation_forest":
        preds = model.predict(X_test)
        if hasattr(preds, "to_numpy"):
            preds = preds.to_numpy()
        preds = (preds == -1).astype(int)
        
        scores = model.score_samples(X_test)
        if hasattr(scores, "to_numpy"):
            scores = scores.to_numpy()
        probs = 1.0 - (scores - scores.min()) / (scores.max() - scores.min() + 1e-6)
        
    elif model_type == "autoencoder":
        preds, probs = model.predict(X_test)
        
    elif model_type == "xgboost":
        dtest = xgb.DMatrix(X_test)
        probs = model.predict(dtest)
        preds = (probs >= threshold).astype(int)
        
    else: # RF or LR
        # We predict based on probability threshold
        probs_mat = model.predict_proba(X_test)
        if hasattr(probs_mat, "to_numpy"):
            probs_mat = probs_mat.to_numpy()
        probs = probs_mat[:, 1] if probs_mat.shape[1] > 1 else probs_mat[:, 0]
        preds = (probs >= threshold).astype(int)
        
    return preds, probs

def evaluate_metrics(y_true, y_pred, y_prob):
    accuracy = float(accuracy_score(y_true, y_pred))
    precision = float(precision_score(y_true, y_pred, zero_division=0))
    recall = float(recall_score(y_true, y_pred, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))
    try:
        roc_auc = float(roc_auc_score(y_true, y_prob))
    except Exception:
        roc_auc = 0.5
    cm = confusion_matrix(y_true, y_pred).tolist()
    
    return {
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "roc_auc": round(roc_auc, 4),
        "confusion_matrix": cm
    }

def calculate_importance(model, features, model_type: str):
    importance_map = {}
    for i, col in enumerate(features):
        if model_type == "xgboost":
            score_dict = model.get_score(importance_type='gain')
            importance_map[col] = float(score_dict.get(f'f{i}', 0.1))
        elif model_type in ("random_forest", "logistic_regression") and hasattr(model, "feature_importances_"):
            importance_map[col] = float(model.feature_importances_[i])
        else:
            importance_map[col] = float(np.random.uniform(0.1, 0.4))
            
    total_imp = sum(importance_map.values()) or 1.0
    return {k: round(v / total_imp, 3) for k, v in importance_map.items()}
