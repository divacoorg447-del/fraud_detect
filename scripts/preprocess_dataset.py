import os
import sys
import pandas as pd

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def main():
    print("=== FraudGuard Dataset Preprocessing Engine ===")
    datasets_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "datasets", "training")
    input_path = os.path.join(datasets_dir, "sample_beneficiaries.csv")
    
    if not os.path.exists(input_path):
        print(f"Input file not found at {input_path}")
        return
        
    print(f"Reading raw file from: {input_path}")
    df = pd.read_csv(input_path)
    print(f"Original shape: {df.shape}")
    
    # Simple preprocessing routine
    print("Standardizing numeric and category column defaults...")
    numeric_cols = ['claims_per_month', 'amount', 'account_age_days']
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
            median_val = df[col].median()
            df[col] = df[col].fillna(median_val if not pd.isna(median_val) else 0)
            
    print(f"Cleaned shape: {df.shape}")
    print("Dataset ready for GPU training runs.")

if __name__ == "__main__":
    main()
