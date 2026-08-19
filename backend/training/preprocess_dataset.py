import pandas as pd
import numpy as np

def impute_missing_values(df: pd.DataFrame, target_col: str = None) -> pd.DataFrame:
    df = df.copy()
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols = df.select_dtypes(exclude=[np.number]).columns.tolist()
    
    if target_col:
        if target_col in num_cols:
            num_cols.remove(target_col)
        if target_col in cat_cols:
            cat_cols.remove(target_col)
            
    for col in num_cols:
        df[col] = df[col].fillna(df[col].median() if not pd.isna(df[col].median()) else 0)
        
    for col in cat_cols:
        df[col] = df[col].astype(str).fillna("Unknown").str.strip()
        
    return df

def remove_duplicates(df: pd.DataFrame) -> pd.DataFrame:
    return df.drop_duplicates()

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    if "amount" in df.columns and "oldbalanceOrg" in df.columns:
        df["amt_org_balance_ratio"] = df["amount"] / (df["oldbalanceOrg"] + 1e-5)
    if "TransactionAmt" in df.columns and "card1" in df.columns:
        df["amt_card1_ratio"] = df["TransactionAmt"] / (df["card1"] + 1e-5)
    return df

def encode_categorical(df: pd.DataFrame, target_col: str = None) -> pd.DataFrame:
    df = df.copy()
    cat_cols = df.select_dtypes(exclude=[np.number]).columns.tolist()
    if target_col and target_col in cat_cols:
        cat_cols.remove(target_col)
        
    for col in cat_cols:
        codes, _ = pd.factorize(df[col])
        df[col] = codes
    return df

def select_features(df: pd.DataFrame, target_col: str = None) -> pd.DataFrame:
    df = df.copy()
    cols_to_check = [c for c in df.columns if c != target_col]
    variances = df[cols_to_check].var()
    non_zero_var_cols = variances[variances > 1e-5].index.tolist()
    if target_col:
        non_zero_var_cols.append(target_col)
    return df[non_zero_var_cols]

def scale_features(df: pd.DataFrame, target_col: str = None) -> pd.DataFrame:
    df = df.copy()
    cols_to_scale = [c for c in df.columns if c != target_col]
    X = df[cols_to_scale]
    X_scaled = (X - X.min()) / (X.max() - X.min() + 1e-6)
    
    if target_col:
        X_scaled[target_col] = df[target_col]
    return X_scaled
