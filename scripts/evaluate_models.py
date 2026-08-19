import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.training.pipeline import load_registry

def main():
    print("=== FraudGuard Classifier Evaluation Dashboard ===")
    registry = load_registry()
    
    if not registry:
        print("No models have been trained or registered yet. Run train_model.py first.")
        return
        
    print(f"\nFound {len(registry)} registered models:\n")
    print(f"{'MODEL TYPE':<20} | {'ACCURACY':<10} | {'PRECISION':<10} | {'RECALL':<10} | {'F1-SCORE':<10} | {'EXEC MODE':<15}")
    print("-" * 88)
    
    for name, info in registry.items():
        metrics = info.get("metrics", {})
        print(
            f"{name.upper():<20} | "
            f"{metrics.get('accuracy', 0.0):<10} | "
            f"{metrics.get('precision', 0.0):<10} | "
            f"{metrics.get('recall', 0.0):<10} | "
            f"{metrics.get('f1_score', 0.0):<10} | "
            f"{info.get('execution_mode', 'CPU'):<15}"
        )

if __name__ == "__main__":
    main()
