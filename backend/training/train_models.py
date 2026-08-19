import time
import torch
import numpy as np

# Try importing RAPIDS
try:
    import cudf
    import cuml
    RAPIDS_AVAILABLE = True
except ImportError:
    RAPIDS_AVAILABLE = False

from backend.training.pytorch_autoencoder import PyTorchAutoEncoder

def train_xgboost(X_train, y_train, hyperparams: dict, use_gpu: bool = False):
    import xgboost as xgb
    max_depth = hyperparams.get("max_depth", 6)
    
    # Calculate scale_pos_weight for class imbalance handling
    neg_count = np.sum(y_train == 0)
    pos_count = np.sum(y_train == 1)
    scale_pos_weight = float(neg_count / (pos_count + 1e-5))
    
    dtrain = xgb.DMatrix(X_train, label=y_train)
    params = {
        'max_depth': max_depth,
        'objective': 'binary:logistic',
        'tree_method': 'hist',
        'device': 'cuda' if use_gpu else 'cpu',
        'scale_pos_weight': scale_pos_weight
    }
    model = xgb.train(params, dtrain, num_boost_round=50)
    return model

def train_random_forest(X_train, y_train, hyperparams: dict, use_gpu: bool = False):
    max_depth = hyperparams.get("max_depth", 8)
    if use_gpu and RAPIDS_AVAILABLE:
        from cuml.ensemble import RandomForestClassifier as cumlRF
        # cuML RF doesn't support class_weight but works well with optimized thresholding
        model = cumlRF(n_estimators=100, max_depth=max_depth)
        model.fit(X_train, y_train)
    else:
        from sklearn.ensemble import RandomForestClassifier
        model = RandomForestClassifier(n_estimators=100, max_depth=max_depth, class_weight='balanced', random_state=42)
        model.fit(X_train, y_train)
    return model

def train_isolation_forest(X_train, hyperparams: dict, use_gpu: bool = False):
    contamination = hyperparams.get("contamination", 0.15)
    if use_gpu and RAPIDS_AVAILABLE:
        from cuml.ensemble import IsolationForest as cumlIF
        model = cumlIF(n_estimators=100, contamination=contamination)
        model.fit(X_train)
    else:
        from sklearn.ensemble import IsolationForest
        model = IsolationForest(n_estimators=100, contamination=contamination, random_state=42)
        model.fit(X_train)
    return model

def train_logistic_regression(X_train, y_train, use_gpu: bool = False):
    if use_gpu and RAPIDS_AVAILABLE:
        from cuml.linear_model import LogisticRegression as cumlLR
        # cuML LR doesn't support class_weight directly, but optimizes via thresholding
        model = cumlLR()
        model.fit(X_train, y_train)
    else:
        from sklearn.linear_model import LogisticRegression
        model = LogisticRegression(class_weight='balanced', random_state=42)
        model.fit(X_train, y_train)
    return model

def train_autoencoder(X_train, hyperparams: dict, use_gpu: bool = False):
    epochs = hyperparams.get("epochs", 20)
    lr = hyperparams.get("lr", 0.01)
    model = PyTorchAutoEncoder(input_dim=X_train.shape[1], epochs=epochs, lr=lr)
    if not use_gpu:
        model.device = torch.device("cpu")
        model.model = model.model.to(model.device)
    model.fit(X_train)
    return model
