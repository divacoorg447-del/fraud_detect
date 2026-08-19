import uvicorn
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from backend.routers.auth import router as auth_router
from backend.routers.upload import router as upload_router, uploads_router
from backend.routers.prediction import router as prediction_router
from backend.routers.analytics import router as analytics_router
from backend.routers.gpu import router as gpu_router
from backend.routers.model import router as model_router
from backend.routers.reports import router as reports_router
from backend.routers.copilot import router as copilot_router
from backend.gpu.monitor import get_gpu_telemetry
from backend.utils.logging_helper import log_event

app = FastAPI(
    title="FraudGuard AI Platform",
    description="GPU-Accelerated Fraud Detection Platform API Gateway",
    version="1.0.0"
)

# Configure CORS Middleware to allow requests from the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for dev simplicity, can narrow to local port in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom API request logging middleware
@app.middleware("http")
async def log_api_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    log_event("api", f"{request.method} {request.url.path} - Status {response.status_code} - {round(duration * 1000, 2)}ms")
    return response

# Register Endpoint Routers
app.include_router(auth_router)
app.include_router(upload_router)
app.include_router(uploads_router)
app.include_router(prediction_router)
app.include_router(analytics_router)
app.include_router(gpu_router)
app.include_router(model_router)
app.include_router(reports_router)
app.include_router(copilot_router)

@app.get("/api/health")
def health_check():
    """Returns platform diagnostic checks and GPU acceleration details."""
    gpu_info = get_gpu_telemetry()
    return {
        "status": "ONLINE",
        "api_version": "1.0.0",
        "diagnostics": gpu_info
    }

if __name__ == "__main__":
    uvicorn.run("backend.app:app", host="0.0.0.0", port=8000, reload=True)
