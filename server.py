from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Any
import time
import uvicorn
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for node data
nodes_data = {}

class GPUUser(BaseModel):
    username: str
    memory: int

class GPUInfo(BaseModel):
    index: int
    name: str
    memory_total: int
    memory_used: int
    utilization: int
    temperature: int
    power: float
    users: List[GPUUser] = []

class NodeReport(BaseModel):
    node_name: str
    timestamp: float
    cpu_load: float = 0.0
    ram_usage: float = 0.0
    gpus: List[GPUInfo]

@app.post("/api/report")
async def report_gpu(report: NodeReport):
    nodes_data[report.node_name] = {
        "last_seen": time.time(),
        "cpu_load": report.cpu_load,
        "ram_usage": report.ram_usage,
        "gpus": [gpu.dict() for gpu in report.gpus]
    }
    return {"status": "success"}

@app.get("/api/nodes")
async def get_nodes():
    current_time = time.time()
    result = []
    for node_name, data in nodes_data.items():
        # Mark offline if not seen for 30 seconds
        is_online = (current_time - data["last_seen"]) < 30
        result.append({
            "node_name": node_name,
            "is_online": is_online,
            "last_seen": data["last_seen"],
            "cpu_load": data.get("cpu_load", 0.0),
            "ram_usage": data.get("ram_usage", 0.0),
            "gpus": data["gpus"]
        })
    return result

# Serve the React frontend if built
if os.path.isdir("dist"):
    app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        return FileResponse("dist/index.html")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

