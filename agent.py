import time
import json
import socket
import urllib.request
import subprocess

# Configure your central server URL here
SERVER_URL = "http://10.5.38.35:8000/api/report"
NODE_NAME = socket.gethostname()
INTERVAL = 5

def get_node_metrics():
    try:
        # CPU Load (1 min average)
        with open('/proc/loadavg', 'r') as f:
            cpu_load = float(f.read().split()[0])
        
        # RAM Usage
        with open('/proc/meminfo', 'r') as f:
            lines = f.readlines()
            mem_total = 0
            mem_available = 0
            for line in lines:
                if line.startswith('MemTotal:'):
                    mem_total = int(line.split()[1])
                elif line.startswith('MemAvailable:'):
                    mem_available = int(line.split()[1])
            
            ram_usage_pct = 0
            if mem_total > 0:
                ram_usage_pct = round((1 - (mem_available / mem_total)) * 100, 1)
        
        return cpu_load, ram_usage_pct
    except Exception as e:
        print(f"Error getting node metrics: {e}")
        return 0.0, 0.0

def get_username(pid):
    try:
        # Get the real user of the process
        user = subprocess.check_output(['ps', '-o', 'user=', '-p', str(pid)], encoding='utf-8').strip()
        return user
    except Exception:
        return "unknown"

def get_gpu_info():
    try:
        # Using nvidia-smi to get GPU details
        result = subprocess.check_output(
            [
                "nvidia-smi",
                "--query-gpu=index,uuid,name,memory.total,memory.used,utilization.gpu,temperature.gpu,power.draw",
                "--format=csv,noheader,nounits"
            ],
            encoding="utf-8"
        )
        
        gpus = []
        gpu_by_uuid = {}
        for line in result.strip().split('\n'):
            if not line:
                continue
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 8:
                uuid = parts[1]
                gpu_obj = {
                    "index": int(parts[0]),
                    "name": parts[2],
                    "memory_total": int(parts[3]),
                    "memory_used": int(parts[4]),
                    "utilization": int(parts[5]),
                    "temperature": int(parts[6]),
                    "power": float(parts[7]) if parts[7] != '[Not Supported]' else 0.0,
                    "users": []
                }
                gpus.append(gpu_obj)
                gpu_by_uuid[uuid] = gpu_obj

        # Get process info
        try:
            apps_result = subprocess.check_output(
                [
                    "nvidia-smi",
                    "--query-compute-apps=gpu_uuid,pid,used_memory",
                    "--format=csv,noheader,nounits"
                ],
                encoding="utf-8"
            )
            
            user_mem_by_gpu = {} # uuid -> {username: memory}
            for line in apps_result.strip().split('\n'):
                if not line: continue
                parts = [p.strip() for p in line.split(',')]
                if len(parts) >= 3:
                    uuid = parts[0]
                    pid = parts[1]
                    mem_str = parts[2]
                    mem = int(mem_str) if mem_str.isdigit() else 0
                    
                    username = get_username(pid)
                    
                    if uuid not in user_mem_by_gpu:
                        user_mem_by_gpu[uuid] = {}
                    
                    if username in user_mem_by_gpu[uuid]:
                        user_mem_by_gpu[uuid][username] += mem
                    else:
                        user_mem_by_gpu[uuid][username] = mem
            
            # Attach to gpus
            for uuid, users_dict in user_mem_by_gpu.items():
                if uuid in gpu_by_uuid:
                    gpu_by_uuid[uuid]["users"] = [{"username": u, "memory": m} for u, m in users_dict.items()]
                    
        except Exception as e:
            print(f"Error getting process info: {e}")

        return gpus
    except Exception as e:
        print(f"Error getting GPU info: {e}")
        return []

def main():
    print(f"Starting GPU agent on {NODE_NAME}...")
    while True:
        gpus = get_gpu_info()
        cpu_load, ram_usage = get_node_metrics()
        payload = {
            "node_name": NODE_NAME,
            "timestamp": time.time(),
            "cpu_load": cpu_load,
            "ram_usage": ram_usage,
            "gpus": gpus
        }
        
        try:
            req = urllib.request.Request(SERVER_URL, method="POST")
            req.add_header("Content-Type", "application/json")
            data = json.dumps(payload).encode("utf-8")
            with urllib.request.urlopen(req, data=data, timeout=3) as response:
                if response.status != 200:
                    print(f"Failed to report: {response.status}")
        except Exception as e:
            print(f"Error sending report: {e}")
            
        # Synchronize to exact 5-second boundaries so all nodes report simultaneously
        now = time.time()
        sleep_time = INTERVAL - (now % INTERVAL)
        time.sleep(sleep_time)

if __name__ == "__main__":
    main()
