from fastapi import APIRouter, HTTPException, Depends, Query
from backend.database.connection import supabase, supabase_admin
from backend.utils.security import get_current_user
from backend.schemas.prediction import CaseStatusUpdate, CaseNoteUpdate
from datetime import datetime
from typing import Optional, List

router = APIRouter(prefix="/api/predictions", tags=["predictions"])

@router.get("")
def get_predictions(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    current_user = Depends(get_current_user)
):
    """
    Fetches prediction records. Integrates filters for search query keywords,
    severity tags, and active case status.
    """
    try:
        query = supabase.table("predictions").select("*")
        
        # Apply filters if present
        if status:
            query = query.eq("status", status)
        if severity:
            query = query.eq("severity", severity)
            
        res = query.order("risk_score", desc=True).execute()
        records = res.data or []

        # Enrich records with ML prediction metrics and SHAP explanation
        for r in records:
            risk = float(r.get("risk_score", 0))
            prob = risk / 100.0
            r["fraud_prediction"] = r.get("fraud_prediction", int(prob >= 0.5))
            r["fraud_probability"] = r.get("fraud_probability", prob)
            r["confidence"] = r.get("confidence", round(float(abs(prob - 0.5) * 2), 4))
            r["model_used"] = r.get("model_used", "xgboost")
            r["execution_mode"] = r.get("execution_mode", "CPU Fallback")
            
            # Construct explanation reasons
            reasons_list = []
            if float(r.get('amount', 0)) > 40000:
                reasons_list.append("High transaction amount")
            if int(r.get('account_age_days', 0)) < 30:
                reasons_list.append("New account")
            if int(r.get('claims_per_month', 0)) > 6:
                reasons_list.append("Foreign IP")
            if int(r.get('location_cluster', 0)) <= 2:
                reasons_list.append("Unusual device")
            if not reasons_list:
                reasons_list.append("Normal baseline activity")
            explanation_text = " ↓ ".join(reasons_list)
            
            r["shap_explanation"] = r.get("shap_explanation", explanation_text)
            r["reasons"] = r.get("reasons", explanation_text)

        # Apply in-memory text search filtering if search keyword is provided
        if search:
            s_lower = search.lower()
            records = [
                r for r in records if 
                s_lower in r.get("id", "").lower() or
                s_lower in r.get("beneficiary_id", "").lower() or
                s_lower in r.get("name", "").lower() or
                s_lower in r.get("state", "").lower() or
                s_lower in r.get("scheme", "").lower() or
                s_lower in r.get("phone", "").lower()
            ]

        return records
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")

@router.get("/audit-logs")
def get_audit_logs(current_user = Depends(get_current_user)):
    """Retrieves security audit logs from the database."""
    try:
        res = supabase.table("audit_logs").select("*").order("created_at", desc=True).execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query audit logs: {str(e)}")

@router.put("/{case_id}/status")
def update_case_status(
    case_id: str,
    payload: CaseStatusUpdate,
    current_user = Depends(get_current_user)
):
    """
    Updates the escalation/resolution status of a case, creates an audit trail entry,
    and updates historical timestamp logs.
    """
    try:
        # Check if case exists
        case_res = supabase.table("predictions").select("*").eq("id", case_id).single().execute()
        if not case_res.data:
            raise HTTPException(status_code=404, detail="Case record not found.")

        old_case = case_res.data
        new_status = payload.status
        update_data = {"status": new_status}

        # Handle lifecycle timestamps
        if new_status == "ESCALATED":
            update_data["escalated_at"] = datetime.utcnow().isoformat()
        elif new_status == "RESOLVED":
            update_data["resolved_at"] = datetime.utcnow().isoformat()

        # Update case record
        update_res = supabase_admin.table("predictions").update(update_data).eq("id", case_id).execute()
        if not update_res.data:
            raise HTTPException(status_code=500, detail="Failed to update case status.")

        # Create audit log record
        audit_log = {
            "case_id": case_id,
            "action": new_status,
            "agent_email": current_user.email,
            "detail": f"Status updated from {old_case['status']} to {new_status} by {current_user.email}."
        }
        supabase_admin.table("audit_logs").insert(audit_log).execute()

        return update_res.data[0]
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update case: {str(e)}")

@router.post("/{case_id}/note")
def add_case_note(
    case_id: str,
    payload: CaseNoteUpdate,
    current_user = Depends(get_current_user)
):
    """Adds or edits the investigation notes attached to a fraud case file."""
    try:
        # Check if case exists
        case_res = supabase.table("predictions").select("*").eq("id", case_id).single().execute()
        if not case_res.data:
            raise HTTPException(status_code=404, detail="Case record not found.")

        # Update notes field
        update_res = supabase_admin.table("predictions").update({
            "officer_notes": payload.note
        }).eq("id", case_id).execute()
        
        if not update_res.data:
            raise HTTPException(status_code=500, detail="Failed to write notes.")

        # Log note addition event in audit_logs
        audit_log = {
            "case_id": case_id,
            "action": "NOTE_ADDED",
            "agent_email": current_user.email,
            "detail": f"Officer notes modified by {current_user.email}."
        }
        supabase_admin.table("audit_logs").insert(audit_log).execute()

        return update_res.data[0]
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save case notes: {str(e)}")

@router.get("/{case_id}/explain")
def get_case_explanation(case_id: str, current_user = Depends(get_current_user)):
    """Returns Explainable AI (SHAP) feature contributions explaining the classification."""
    from backend.training.shap_explainer import explain_prediction
    try:
        explanation = explain_prediction(case_id)
        if not explanation:
            raise HTTPException(status_code=404, detail="Case or explanation not found.")
        return explanation
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate explanation: {str(e)}")
