import os
import sys
import pandas as pd

# Add project root to sys.path to enable backend module imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.training.pipeline import run_training_pipeline

def main():
    print("=== FraudGuard CLI Model Trainer ===")
    datasets_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "datasets", "training")
    dataset_path = os.path.join(datasets_dir, "sample_beneficiaries.csv")
    
    if not os.path.exists(dataset_path):
        print(f"Training dataset missing at {dataset_path}. Generating default sample...")
        os.makedirs(datasets_dir, exist_ok=True)
        sample_csv = (
            "beneficiary_id,name,phone,state,scheme,claims_per_month,amount,location_cluster,account_age_days\n"
            "BEN001,Rahul Kumar,9812345678,Bihar,MGNREGS,12,95000,2,15\n"
            "BEN002,Priya Singh,9823456789,UP,PM-KISAN,2,8000,7,450\n"
            "BEN003,Amit Sharma,9812345678,Jharkhand,PMAY,15,180000,1,8\n"
            "BEN004,Sunita Devi,9834567890,Rajasthan,Ayushman Bharat,1,6000,9,600\n"
            "BEN005,Raj Patel,9845678901,MP,PMEGP,3,12000,5,300\n"
            "BEN006,Meena Kumari,9812345678,Maharashtra,Mid-Day Meal,18,200000,1,5\n"
        )
        with open(dataset_path, "w") as f:
            f.write(sample_csv)
            
    print(f"Loading training dataset: {dataset_path}")
    df = pd.read_csv(dataset_path)
    
    model_type = "xgboost"
    print(f"Training classifier '{model_type}'...")
    try:
        metrics = run_training_pipeline(df, model_type, {"max_depth": 6})
        print("\n=== Model Training Complete ===")
        print(f"Execution Mode: {metrics['execution_mode']}")
        print(f"Accuracy: {metrics['metrics']['accuracy']}")
        print(f"Precision: {metrics['metrics']['precision']}")
        print(f"Recall: {metrics['metrics']['recall']}")
    except Exception as e:
        print(f"Error during training execution: {e}")

if __name__ == "__main__":
    main()
