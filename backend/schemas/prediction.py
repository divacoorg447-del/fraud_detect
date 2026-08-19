from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class CaseStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(OPEN|ESCALATED|RESOLVED)$")

class CaseNoteUpdate(BaseModel):
    note: str

class PredictionRecord(BaseModel):
    id: str
    upload_id: str
    beneficiary_id: str
    name: str
    phone: str
    state: str
    scheme: str
    claims_per_month: int
    amount: float
    location_cluster: int
    account_age_days: int
    risk_score: float
    severity: str
    status: str
    assigned_to: str
    officer_notes: Optional[str] = None
    created_at: datetime
    escalated_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
