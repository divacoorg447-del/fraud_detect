from pydantic import BaseModel
from typing import List, Dict, Optional

class WeeklyTrendItem(BaseModel):
    week: str
    cases: int
    amount: float

class SchemeLeaderboardItem(BaseModel):
    scheme: str
    count: int
    amount: float

class SharedPhoneNode(BaseModel):
    id: str
    x: float
    y: float

class SharedPhoneEdge(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float

class NetworkGraphData(BaseModel):
    nodes: List[SharedPhoneNode]
    edges: List[SharedPhoneEdge]
    suspicious_count: int
    cluster_count: int

class AnalyticsDashboard(BaseModel):
    total_scanned: int
    fraud_rate: float
    amount_recovered: float
    active_cases: int
    escalated_cases: int
    resolved_cases: int
    weekly_trend: List[WeeklyTrendItem]
    state_data: Dict[str, int]
    scheme_leaderboard: List[SchemeLeaderboardItem]
    network_graph: Optional[NetworkGraphData] = None
