import os
import datetime

LOGS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "logs")

def log_event(category: str, message: str):
    """
    Appends a timestamped log entry to logs/{category}/{category}.log.
    Categories: 'training', 'api', 'gpu'
    """
    try:
        cat_dir = os.path.join(LOGS_DIR, category)
        os.makedirs(cat_dir, exist_ok=True)
        log_file = os.path.join(cat_dir, f"{category}.log")
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(f"[{timestamp}] {message}\n")
    except Exception as e:
        print(f"Logging helper failed: {e}")
