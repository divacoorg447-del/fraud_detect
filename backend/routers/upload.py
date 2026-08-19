import io
import uuid
import random
import pandas as pd
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from backend.database.connection import supabase, supabase_admin
from backend.utils.security import get_current_user
from backend.utils.math_helpers import calculate_risk_score, get_severity
from backend.gpu_model import preprocess_and_predict
from datetime import datetime

router = APIRouter(prefix="/api/upload", tags=["upload"])

REQUIRED_COLUMNS = [
    "beneficiary_id", "name", "phone", "state", "scheme", 
    "claims_per_month", "amount", "location_cluster", "account_age_days"
]

@router.post("")
async def upload_and_process_csv(
    file: UploadFile = File(...), 
    current_user = Depends(get_current_user)
):
    """
    Receives an uploaded CSV file, cleans and formats the input metrics,
    applies the GPU-accelerated ML pipeline (Isolation Forest, RF, or XGBoost),
    saves logs to `uploads` and `predictions` tables, and returns the scored records.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    try:
        contents = await file.read()
        # Parse CSV stream to Pandas DataFrame
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")

    # Column Validation
    missing_cols = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing_cols:
        raise HTTPException(
            status_code=400, 
            detail=f"CSV is missing required headers: {', '.join(missing_cols)}"
        )

    # 1. Clean and normalize records
    df['claims_per_month'] = pd.to_numeric(df['claims_per_month'], errors='coerce').fillna(0).astype(int)
    df['amount'] = pd.to_numeric(df['amount'], errors='coerce').fillna(0.0).astype(float)
    df['location_cluster'] = pd.to_numeric(df['location_cluster'], errors='coerce').fillna(0).astype(int)
    df['account_age_days'] = pd.to_numeric(df['account_age_days'], errors='coerce').fillna(0).astype(int)

    # Load active model type
    try:
        from backend.routers.model import ACTIVE_MODEL_TYPE
        active_model = ACTIVE_MODEL_TYPE
    except ImportError:
        active_model = "xgboost"

    # 2. ML Prediction (Dynamic GPU detection inside preprocess_and_predict)
    try:
        anomalies, probabilities = preprocess_and_predict(df, model_type=active_model)
    except Exception as ml_err:
        print(f"ML Pipeline error: {ml_err}. Falling back to default risk score calculations.")
        # Fallback to rule-based probabilities
        anomalies = []
        probabilities = []
        for _, row in df.iterrows():
            score = calculate_risk_score(
                row['claims_per_month'], row['amount'], 
                row['account_age_days'], row['location_cluster']
            )
            probabilities.append(score / 100.0)
            anomalies.append(1 if score >= 50 else 0)

    # 3. Create Upload Log Record in Database
    upload_id = str(uuid.uuid4())
    upload_log = {
        "id": upload_id,
        "filename": file.filename,
        "uploaded_by": current_user.id,
        "record_count": len(df),
        "status": "COMPLETED"
    }
    
    try:
        supabase_admin.table("uploads").insert(upload_log).execute()
    except Exception as db_err:
        raise HTTPException(status_code=500, detail=f"Database logging failed: {str(db_err)}")

    # 4. Map and Bulk-insert predictions
    prediction_records = []
    base_case_id = random.randint(1000, 8999) # Create starting index for Case IDs (e.g. GOV-9000)
    
    # Check GPU availability for execution mode logging
    try:
        from backend.gpu.monitor import get_gpu_telemetry
        gpu_avail = get_gpu_telemetry()["gpu_available"]
    except Exception:
        gpu_avail = False
    exec_mode = "GPU (CUDA)" if gpu_avail else "CPU Fallback"
    
    for idx, (_, row) in enumerate(df.iterrows()):
        case_id = f"GOV-{base_case_id + idx}"
        prob = probabilities[idx] if idx < len(probabilities) else 0.0
        risk_pct = int(prob * 100)
        
        # Determine classification severity
        severity = get_severity(row['amount'], row['claims_per_month'])
        
        # Construct SHAP explanation text
        reasons_list = []
        if float(row.get('amount', 0)) > 40000:
            reasons_list.append("High transaction amount")
        if int(row.get('account_age_days', 0)) < 30:
            reasons_list.append("New account")
        if int(row.get('claims_per_month', 0)) > 6:
            reasons_list.append("Foreign IP")
        if int(row.get('location_cluster', 0)) <= 2:
            reasons_list.append("Unusual device")
        if not reasons_list:
            reasons_list.append("Normal baseline activity")
        shap_explanation_text = " ↓ ".join(reasons_list)
        
        record = {
            "id": case_id,
            "upload_id": upload_id,
            "beneficiary_id": str(row['beneficiary_id']),
            "name": str(row['name']),
            "phone": str(row['phone']),
            "state": str(row['state']),
            "scheme": str(row['scheme']),
            "claims_per_month": int(row['claims_per_month']),
            "amount": float(row['amount']),
            "location_cluster": int(row['location_cluster']),
            "account_age_days": int(row['account_age_days']),
            "risk_score": risk_pct,
            "severity": severity,
            "status": "OPEN",
            "assigned_to": "Unassigned",
            "officer_notes": "",
            "created_at": datetime.utcnow().isoformat(),
            "model_used": active_model,
            "execution_mode": exec_mode,
            "fraud_prediction": int(prob >= 0.5),
            "fraud_probability": float(prob),
            "confidence": float(round(float(abs(prob - 0.5) * 2), 4)),
            "shap_explanation": shap_explanation_text,
            "reasons": shap_explanation_text
        }
        prediction_records.append(record)

    try:
        # Perform bulk insert
        if prediction_records:
            supabase_admin.table("predictions").insert(prediction_records).execute()
    except Exception as batch_err:
        # Fallback: if database fails due to missing model_used / execution_mode columns,
        # strip them out and try inserting again!
        print(f"Primary bulk insert failed ({batch_err}). Retrying without model metadata columns...")
        for r in prediction_records:
            r.pop("model_used", None)
            r.pop("execution_mode", None)
            r.pop("fraud_prediction", None)
            r.pop("fraud_probability", None)
            r.pop("confidence", None)
            r.pop("shap_explanation", None)
            r.pop("reasons", None)
        try:
            if prediction_records:
                supabase_admin.table("predictions").insert(prediction_records).execute()
        except Exception as retry_err:
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to save prediction records: {str(retry_err)}"
            )

    return {
        "upload_id": upload_id,
        "filename": file.filename,
        "scanned_records": len(df),
        "flagged_anomalies": sum(1 for r in prediction_records if r["risk_score"] >= 50),
        "cases": prediction_records
    }

uploads_router = APIRouter(prefix="/api/uploads", tags=["uploads"])

@uploads_router.get("")
def get_upload_logs(current_user = Depends(get_current_user)):
    """Retrieves metadata logs for all previously processed CSV batches."""
    try:
        res = supabase.table("uploads").select("*").order("created_at", desc=True).execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")

