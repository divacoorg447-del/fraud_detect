import time
from backend.gpu.monitor import get_gpu_telemetry

def benchmark_train_time(train_fn, *args, **kwargs):
    """
    Executes training and returns (model, elapsed_seconds).
    """
    start = time.time()
    model = train_fn(*args, **kwargs)
    duration = time.time() - start
    return model, round(duration, 4)

def benchmark_prediction_time(pred_fn, *args, **kwargs):
    """
    Executes prediction and returns (preds, probs, elapsed_seconds).
    """
    start = time.time()
    preds, probs = pred_fn(*args, **kwargs)
    duration = time.time() - start
    return preds, probs, round(duration, 4)

def get_hardware_telemetry(gpu_active: bool = False):
    """
    Returns timing logs and GPU/CUDA utilization status.
    """
    telemetry = get_gpu_telemetry()
    return {
        "vram_used_mb": telemetry.get("vram_used") if gpu_active else 0,
        "gpu_usage_pct": telemetry.get("utilization") if gpu_active else 0,
        "cuda_active": telemetry.get("gpu_available") and gpu_active
    }
