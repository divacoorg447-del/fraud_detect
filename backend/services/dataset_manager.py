import os
import pandas as pd
import numpy as np

class DatasetManager:
    def __init__(self, raw_dir: str = "raw", processed_dir: str = "datasets/processed"):
        self.raw_dir = raw_dir
        self.processed_dir = processed_dir
        os.makedirs(self.processed_dir, exist_ok=True)

    def scan_datasets(self):
        """
        Scans raw_dir for folders/datasets and returns a list of dictionaries with stats.
        """
        datasets = []
        if not os.path.exists(self.raw_dir):
            return datasets
            
        # Scan subdirectories
        for entry in os.scandir(self.raw_dir):
            if entry.is_dir():
                if entry.name.lower() == "ieee":
                    datasets.append({
                        "id": "ieee-cis",
                        "name": "IEEE-CIS Fraud Detection",
                        "type": "ieee",
                        "path": entry.path,
                        "description": "IEEE-CIS Transaction and Identity dataset merge"
                    })
                elif entry.name.lower() == "paysim":
                    files = [f for f in os.listdir(entry.path) if f.endswith(".csv")]
                    if files:
                        datasets.append({
                            "id": "paysim",
                            "name": "PaySim Financial Logs",
                            "type": "paysim",
                            "path": entry.path,
                            "file": files[0],
                            "description": "PaySim synthetic mobile money transfer logs"
                        })
            elif entry.is_file() and entry.name.endswith(".csv"):
                datasets.append({
                    "id": entry.name.replace(".csv", ""),
                    "name": entry.name.replace(".csv", "").replace("_", " ").title(),
                    "type": "generic",
                    "path": entry.path,
                    "description": f"Custom dataset: {entry.name}"
                })
        return datasets

    def get_dataset_stats(self, dataset_id: str):
        """
        Loads a sample of the dataset to calculate statistical metadata without loading the whole file.
        """
        datasets = self.scan_datasets()
        ds = next((d for d in datasets if d["id"] == dataset_id), None)
        if not ds:
            raise ValueError(f"Dataset {dataset_id} not found.")

        df = self.load_dataset_sample(ds, nrows=1000)
        target_col = self.detect_target_column(df)
        
        # Calculate missing values count
        missing_count = int(df.isnull().sum().sum())
        # Calculate duplicates
        duplicate_count = int(df.duplicated().sum())

        return {
            "dataset_id": dataset_id,
            "name": ds["name"],
            "type": ds["type"],
            "rows": int(self.estimate_total_rows(ds)),
            "columns": list(df.columns),
            "column_count": len(df.columns),
            "missing_values": missing_count,
            "duplicates": duplicate_count,
            "target_column": target_col,
            "description": ds["description"]
        }

    def load_dataset_sample(self, ds: dict, nrows: int = 50000) -> pd.DataFrame:
        """
        Loads up to nrows of the dataset, performing merges if necessary.
        """
        if ds["type"] == "ieee":
            tx_path = os.path.join(ds["path"], "train_transaction.csv")
            id_path = os.path.join(ds["path"], "train_identity.csv")
            if not os.path.exists(tx_path):
                raise FileNotFoundError(f"Missing train_transaction.csv in {ds['path']}")
            
            tx_df = pd.read_csv(tx_path, nrows=nrows)
            if os.path.exists(id_path):
                id_df = pd.read_csv(id_path, nrows=nrows)
                df = pd.merge(tx_df, id_df, on="TransactionID", how="left")
            else:
                df = tx_df
            return df
        elif ds["type"] == "paysim":
            file_path = os.path.join(ds["path"], ds["file"])
            return pd.read_csv(file_path, nrows=nrows)
        else:
            # Generic CSV
            return pd.read_csv(ds["path"], nrows=nrows)

    def estimate_total_rows(self, ds: dict) -> int:
        """
        Estimates total rows in the dataset based on file size or small line counts.
        """
        if ds["type"] == "ieee":
            path = os.path.join(ds["path"], "train_transaction.csv")
        elif ds["type"] == "paysim":
            path = os.path.join(ds["path"], ds["file"])
        else:
            path = ds["path"]

        if not os.path.exists(path):
            return 0
            
        file_size = os.path.getsize(path)
        # PaySim has avg line size ~75 bytes, IEEE has ~1.2k bytes
        avg_line = 1200 if ds["type"] == "ieee" else 80
        return max(1, int(file_size / avg_line))

    def detect_target_column(self, df: pd.DataFrame) -> str:
        target_names = ["isfraud", "is_fraud", "fraud", "class", "target", "label"]
        cols_lower = {col.lower(): col for col in df.columns}
        for t_name in target_names:
            if t_name in cols_lower:
                return cols_lower[t_name]
        for col in df.columns:
            if "fraud" in col.lower():
                return col
        return df.columns[-1]

    def validate_dataset(self, df: pd.DataFrame, target_col: str):
        if df.empty:
            raise ValueError("Dataset is empty.")
        if target_col not in df.columns:
            raise ValueError(f"Target column '{target_col}' not found in dataset.")
        if df[target_col].nunique() < 2:
            raise ValueError(f"Target column '{target_col}' must have at least 2 distinct classes.")

    def preprocess_dataset(self, df: pd.DataFrame, target_col: str):
        # 1. Handle missing values
        num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        cat_cols = df.select_dtypes(exclude=[np.number]).columns.tolist()
        
        if target_col in num_cols:
            num_cols.remove(target_col)
        if target_col in cat_cols:
            cat_cols.remove(target_col)
            
        for col in num_cols:
            df[col] = df[col].fillna(df[col].median() if not pd.isna(df[col].median()) else 0)
            
        for col in cat_cols:
            df[col] = df[col].astype(str).fillna("Unknown").str.strip()

        # 2. Duplicate removal
        df = df.drop_duplicates()

        # 3. Feature engineering
        if "amount" in df.columns and "oldbalanceOrg" in df.columns:
            df["amt_org_balance_ratio"] = df["amount"] / (df["oldbalanceOrg"] + 1e-5)
        if "TransactionAmt" in df.columns and "card1" in df.columns:
            df["amt_card1_ratio"] = df["TransactionAmt"] / (df["card1"] + 1e-5)

        num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        cat_cols = df.select_dtypes(exclude=[np.number]).columns.tolist()
        if target_col in num_cols:
            num_cols.remove(target_col)
        if target_col in cat_cols:
            cat_cols.remove(target_col)

        # 4. Categorical encoding
        X_encoded = pd.DataFrame()
        for col in num_cols:
            X_encoded[col] = df[col]
        for col in cat_cols:
            codes, _ = pd.factorize(df[col])
            X_encoded[col] = codes

        # 5. Feature selection
        variances = X_encoded.var()
        non_zero_var_cols = variances[variances > 1e-5].index.tolist()
        X_encoded = X_encoded[non_zero_var_cols]
        
        # 6. Scaling
        X_scaled = (X_encoded - X_encoded.min()) / (X_encoded.max() - X_encoded.min() + 1e-6)
        
        y = df[target_col].to_numpy()
        
        return X_scaled, y
