import os
import pandas as pd
import numpy as np

GPU_AVAILABLE = False
RAPIDS_IMPORTED = False

# Try importing RAPIDS libraries for GPU acceleration
try:
    import cudf
    import cuml
    import cupy as cp
    GPU_AVAILABLE = True
    RAPIDS_IMPORTED = True
    print("[INFO] RAPIDS GPU Libraries detected successfully (cuDF, cuML, CuPy).")
except ImportError:
    print("[INFO] RAPIDS GPU Libraries not detected. Checking for generic GPU availability in XGBoost...")
    # Check if we can still use GPU in XGBoost or other packages
    try:
        import torch
        if torch.cuda.is_available():
            GPU_AVAILABLE = True
    except ImportError:
        pass

def check_gpu_status():
    """Returns GPU availability stats for diagnostics."""
    status = {
        "gpu_available": GPU_AVAILABLE,
        "rapids_detected": RAPIDS_IMPORTED,
        "device": "CUDA/GPU" if GPU_AVAILABLE else "CPU"
    }
    return status

def preprocess_and_predict(df_pandas: pd.DataFrame, model_type: str = "xgboost"):
    """
    Cleans, encodes, scales the input CSV data, runs predictive inference
    using the chosen model, and returns anomaly flags and risk probabilities.
    
    Models:
    - isolation_forest (Unsupervised)
    - random_forest (Supervised with pseudo-labels)
    - xgboost (Supervised gradient boosting)
    """
    df = df_pandas.copy()

    # 1. Clean missing values
    features = ['claims_per_month', 'amount', 'location_cluster', 'account_age_days']
    for col in features:
        if col not in df.columns:
            df[col] = 0
        # Convert columns to numeric, replacing invalid values with median/0
        df[col] = pd.to_numeric(df[col], errors='coerce')
        median_val = df[col].median()
        if pd.isna(median_val):
            median_val = 0
        df[col] = df[col].fillna(median_val)

    # Clean categorical columns
    cat_cols = ['state', 'scheme']
    for col in cat_cols:
        if col not in df.columns:
            df[col] = "Unknown"
        df[col] = df[col].astype(str).fillna("Unknown").str.strip()

    # 2. Preprocess & Scale
    X_raw = df[features].copy()
    
    # Min-max scale numerical metrics to prevent scale skew
    X_scaled = (X_raw - X_raw.min()) / (X_raw.max() - X_raw.min() + 1e-6)

    # Encode categoricals using label indexing
    for col in cat_cols:
        codes, _ = pd.factorize(df[col])
        X_scaled[col] = codes

    # Initialize return predictions
    anomalies = np.zeros(len(df))
    probabilities = np.zeros(len(df))

    # Try loading pre-trained model from disk first (checking best_model.pkl first)
    import pickle
    root_dir = os.path.dirname(os.path.dirname(__file__))
    
    # Paths to search for best_model.pkl
    best_model_paths = [
        os.path.join(root_dir, "backend", "models", "best_model.pkl"),
        os.path.join(root_dir, "models", "best_model.pkl"),
    ]
    
    loaded_data = None
    for path in best_model_paths:
        if os.path.exists(path):
            try:
                with open(path, "rb") as f:
                    loaded_data = pickle.load(f)
                    print(f"[INFO] Successfully loaded best model from {path}")
                    break
            except Exception as e:
                print(f"[WARNING] Failed to load {path}: {e}")
                
    if not loaded_data:
        # Fallback to model_type.pkl
        fallback_paths = [
            os.path.join(root_dir, "backend", "models", f"{model_type}.pkl"),
            os.path.join(root_dir, "models", f"{model_type}.pkl"),
            os.path.join(root_dir, "models", "trained", f"{model_type}.pkl"),
        ]
        for path in fallback_paths:
            if os.path.exists(path):
                try:
                    with open(path, "rb") as f:
                        loaded_data = pickle.load(f)
                        print(f"[INFO] Successfully loaded fallback model from {path}")
                        break
                except Exception as e:
                    print(f"[WARNING] Failed to load {path}: {e}")

    if loaded_data:
        try:
            if isinstance(loaded_data, dict) and "model" in loaded_data:
                trained_model = loaded_data["model"]
                m_type = loaded_data.get("model_type", model_type)
                m_features = loaded_data.get("features", features)
                threshold = loaded_data.get("threshold", 0.5)
            else:
                trained_model = loaded_data
                m_type = model_type
                m_features = features
                threshold = 0.5

            # Align features dynamically
            for f_col in m_features:
                if f_col not in X_scaled.columns:
                    X_scaled[f_col] = 0.0
            X_input = X_scaled[m_features]

            # Predict using loaded model
            if m_type == "autoencoder":
                anoms, probs = trained_model.predict(X_input.to_numpy())
                return anoms.tolist(), probs.tolist()
            elif m_type == "xgboost":
                import xgboost as xgb
                dtest = xgb.DMatrix(X_input)
                probs = trained_model.predict(dtest)
                anoms = (probs >= threshold).astype(int)
                return anoms.tolist(), probs.tolist()
            elif m_type == "isolation_forest":
                preds = trained_model.predict(X_input.to_numpy())
                anoms = (preds == -1).astype(int)
                scores = trained_model.score_samples(X_input.to_numpy())
                probs = 1.0 - (scores - scores.min()) / (scores.max() - scores.min() + 1e-6)
                return anoms.tolist(), probs.tolist()
            else: # RF or LR
                probs_mat = trained_model.predict_proba(X_input.to_numpy())
                if hasattr(probs_mat, "to_numpy"):
                    probs_mat = probs_mat.to_numpy()
                probs = probs_mat[:, 1] if probs_mat.shape[1] > 1 else probs_mat[:, 0]
                anoms = (probs >= threshold).astype(int)
                return anoms.tolist(), probs.tolist()
        except Exception as load_err:
            print(f"[WARNING] Failed to predict using loaded model ({load_err}). Using fallback fitting...")

    # Calculate rule-based risk score targets to use as pseudo-labels for RF and XGBoost
    # Risk Score vectors: claims > 6 (25%), amount > 40000 (25%), account_age < 30 (25%), location <= 2 (25%)
    pseudo_labels = (
        (df['claims_per_month'] > 6).astype(int) + 
        (df['amount'] > 40000).astype(int) + 
        (df['account_age_days'] < 30).astype(int) + 
        (df['location_cluster'] <= 2).astype(int)
    ) >= 2 # Flag as anomaly if 2 or more vectors are matched
    y_pseudo = pseudo_labels.astype(int).to_numpy()

    # 3. Predict Anomaly flags & Risk probabilities
    if GPU_AVAILABLE and RAPIDS_IMPORTED:
        try:
            # Transfer features matrix to GPU memory using cuDF
            X_gpu = cudf.DataFrame.from_pandas(X_scaled)
            
            if model_type == "isolation_forest":
                from cuml.ensemble import IsolationForest as cumlIsolationForest
                model = cumlIsolationForest(n_estimators=100, contamination=0.15)
                model.fit(X_gpu)
                # cuML Isolation Forest predict returns -1 for anomalies, 1 for inliers
                preds = model.predict(X_gpu).to_numpy()
                anomalies = (preds == -1).astype(int)
                scores = model.score_samples(X_gpu).to_numpy()
                # Inverse normalize anomaly scores (closer to 1 means more anomalous)
                probabilities = 1.0 - (scores - scores.min()) / (scores.max() - scores.min() + 1e-6)

            elif model_type == "random_forest":
                from cuml.ensemble import RandomForestClassifier as cumlRF
                y_gpu = cudf.Series(y_pseudo)
                model = cumlRF(n_estimators=100, max_depth=8)
                model.fit(X_gpu, y_gpu)
                preds = model.predict(X_gpu).to_numpy()
                probs = model.predict_proba(X_gpu).to_numpy()
                anomalies = preds
                probabilities = probs[:, 1] if probs.shape[1] > 1 else probs[:, 0]

            else: # xgboost
                import xgboost as xgb
                dtrain = xgb.DMatrix(X_scaled, label=y_pseudo)
                params = {
                    'max_depth': 6,
                    'objective': 'binary:logistic',
                    'tree_method': 'hist',
                    'device': 'cuda'
                }
                bst = xgb.train(params, dtrain, num_boost_round=50)
                probs = bst.predict(dtrain)
                anomalies = (probs > 0.5).astype(int)
                probabilities = probs
                
        except Exception as gpu_err:
            print(f"[WARNING] GPU Execution failed ({gpu_err}). Falling back to CPU...")
            anomalies, probabilities = _predict_cpu(X_scaled, y_pseudo, model_type)
    else:
        # Graceful CPU execution
        anomalies, probabilities = _predict_cpu(X_scaled, y_pseudo, model_type)

    # Cast metrics to native python lists
    return anomalies.tolist(), probabilities.tolist()

def _predict_cpu(X_scaled, y_pseudo, model_type):
    """Fallback CPU pipeline using scikit-learn and standard xgboost."""
    anomalies = np.zeros(X_scaled.shape[0])
    probabilities = np.zeros(X_scaled.shape[0])

    if model_type == "isolation_forest":
        from sklearn.ensemble import IsolationForest
        model = IsolationForest(n_estimators=100, contamination=0.15, random_state=42)
        model.fit(X_scaled)
        preds = model.predict(X_scaled)
        anomalies = (preds == -1).astype(int)
        scores = model.score_samples(X_scaled)
        probabilities = 1.0 - (scores - scores.min()) / (scores.max() - scores.min() + 1e-6)

    elif model_type == "random_forest":
        from sklearn.ensemble import RandomForestClassifier
        model = RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42)
        model.fit(X_scaled, y_pseudo)
        preds = model.predict(X_scaled)
        probs = model.predict_proba(X_scaled)
        anomalies = preds
        probabilities = probs[:, 1] if probs.shape[1] > 1 else probs[:, 0]

    else: # xgboost
        import xgboost as xgb
        dtrain = xgb.DMatrix(X_scaled, label=y_pseudo)
        params = {
            'max_depth': 6,
            'objective': 'binary:logistic',
            'tree_method': 'hist',
            'device': 'cpu'
        }
        bst = xgb.train(params, dtrain, num_boost_round=50)
        probs = bst.predict(dtrain)
        anomalies = (probs > 0.5).astype(int)
        probabilities = probs

    return anomalies, probabilities
