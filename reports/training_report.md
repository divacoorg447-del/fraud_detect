# FraudGuard Model Training & Evaluation Report

- **Dataset ID**: ieee-cis
- **Timestamp**: 2026-07-10T22:55:53.334593
- **Best Selected Model**: XGBOOST (F1-score: 0.6270)

## Model Performance & Benchmarking Comparison

| Model | Accuracy | Precision | Recall | F1-Score | ROC AUC | CPU Train Time | GPU Train Time | GPU Acceleration |
|-------|----------|-----------|--------|----------|---------|----------------|----------------|------------------|
| ISOLATION_FOREST | 0.8581 | 0.0883 | 0.4434 | 0.1473 | 0.7111 | 1.548s | 1.469s | YES |
| RANDOM_FOREST | 0.9774 | 0.6429 | 0.4072 | 0.4986 | 0.8502 | 8.770s | 5.996s | YES |
| LOGISTIC_REGRESSION | 0.9639 | 0.3618 | 0.4027 | 0.3812 | 0.8351 | 1.502s | 1.538s | YES |
| AUTOENCODER | 0.9689 | 0.1957 | 0.0407 | 0.0674 | 0.6066 | 98.604s | 80.975s | YES |
| XGBOOST | 0.9828 | 0.7785 | 0.5249 | 0.6270 | 0.9197 | 1.298s | 1.168s | YES |
