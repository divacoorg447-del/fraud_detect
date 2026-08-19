import os
import subprocess
import shutil

try:
    import pynvml
    PYNVML_AVAILABLE = True
except ImportError:
    PYNVML_AVAILABLE = False

def get_gpu_telemetry():
    """
    Attempts to read NVIDIA GPU stats dynamically.
    Returns details like name, utilization, VRAM usage, and CUDA version.
    """
    gpu_stats = {
        "gpu_available": False,
        "name": "N/A",
        "cuda_version": "N/A",
        "vram_total": 0.0,
        "vram_used": 0.0,
        "vram_free": 0.0,
        "utilization": 0.0,
        "temperature": 0.0
    }
    
    # 1. Try pynvml first
    if PYNVML_AVAILABLE:
        try:
            pynvml.nvmlInit()
            device_count = pynvml.nvmlDeviceGetCount()
            if device_count > 0:
                handle = pynvml.nvmlDeviceGetHandleByIndex(0)
                gpu_stats["gpu_available"] = True
                # Get name
                name_bytes = pynvml.nvmlDeviceGetName(handle)
                gpu_stats["name"] = name_bytes.decode('utf-8') if isinstance(name_bytes, bytes) else str(name_bytes)
                
                # VRAM
                mem_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
                gpu_stats["vram_total"] = round(mem_info.total / (1024 ** 2), 2)  # MB
                gpu_stats["vram_used"] = round(mem_info.used / (1024 ** 2), 2)    # MB
                gpu_stats["vram_free"] = round(mem_info.free / (1024 ** 2), 2)    # MB
                
                # Utilization
                util = pynvml.nvmlDeviceGetUtilizationRates(handle)
                gpu_stats["utilization"] = float(util.gpu)
                
                # Temperature
                temp = pynvml.nvmlDeviceGetTemperature(handle, pynvml.NVML_TEMPERATURE_GPU)
                gpu_stats["temperature"] = float(temp)
                
                # Driver/CUDA version
                driver_ver = pynvml.nvmlSystemGetDriverVersion()
                gpu_stats["cuda_version"] = f"Driver: {driver_ver.decode('utf-8') if isinstance(driver_ver, bytes) else str(driver_ver)}"
                
                pynvml.nvmlShutdown()
                return gpu_stats
        except Exception as e:
            # Fallback to nvidia-smi if nvml fails
            pass
            
    # 2. Try running nvidia-smi via subprocess
    if shutil.which("nvidia-smi"):
        try:
            query = "name,driver_version,memory.total,memory.used,memory.free,utilization.gpu,temperature.gpu"
            cmd = ["nvidia-smi", f"--query-gpu={query}", "--format=csv,noheader,nounits"]
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
            output = result.stdout.strip()
            if output:
                parts = [p.strip() for p in output.split(",")]
                if len(parts) >= 7:
                    gpu_stats["gpu_available"] = True
                    gpu_stats["name"] = parts[0]
                    gpu_stats["cuda_version"] = f"Driver: {parts[1]}"
                    gpu_stats["vram_total"] = float(parts[2])  # MB
                    gpu_stats["vram_used"] = float(parts[3])   # MB
                    gpu_stats["vram_free"] = float(parts[4])   # MB
                    gpu_stats["utilization"] = float(parts[5]) # %
                    gpu_stats["temperature"] = float(parts[6]) # C
                    return gpu_stats
        except Exception as e:
            pass

    # 3. Fallback: Check PyTorch CUDA availability
    try:
        import torch
        if torch.cuda.is_available():
            gpu_stats["gpu_available"] = True
            gpu_stats["name"] = torch.cuda.get_device_name(0)
            gpu_stats["cuda_version"] = f"CUDA {torch.version.cuda}"
            gpu_stats["vram_total"] = round(torch.cuda.get_device_properties(0).total_memory / (1024 ** 2), 2)
            gpu_stats["vram_used"] = round(torch.cuda.memory_allocated(0) / (1024 ** 2), 2)
            gpu_stats["vram_free"] = gpu_stats["vram_total"] - gpu_stats["vram_used"]
            gpu_stats["utilization"] = 0.0
            return gpu_stats
    except Exception:
        pass

    return gpu_stats
