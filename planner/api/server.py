import time
import asyncio
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from planner.astar import Astar
from planner.rrt_star import Rrtstar
from shared_memory import SharedMemoryReader

# create FastAPI app
app = FastAPI(title="Drone Sim Planner API")

# allow React frontend to connect from any origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic model for mission requests
# FastAPI uses this to validate and parse incoming JSON automatically
class MissionRequest(BaseModel):
    start: tuple[float, float, float]       # starting position (x, y, z)
    goal: tuple[float, float, float]        # goal position (x, y, z)
    obstacles: list[tuple[float, float, float]]  # list of obstacle positions

# initialize both planners once at startup
astar = Astar()
rrtstar = Rrtstar()


@app.post("/plan/astar")
async def plan_astar(mission: MissionRequest):
    """Run A* planner on a mission and return the path with timing."""
    start_time = time.time()
    path = astar.find_path(mission.start, mission.goal, mission.obstacles)
    compute_time = time.time() - start_time

    return {
        "algorithm": "astar",
        "path": path,
        "path_length": len(path),
        "compute_time_ms": round(compute_time * 1000, 3)
    }


@app.post("/plan/rrtstar")
async def plan_rrtstar(mission: MissionRequest):
    """Run RRT* planner on a mission and return the path with timing."""
    start_time = time.time()
    path = rrtstar.find_path(mission.start, mission.goal, mission.obstacles)
    compute_time = time.time() - start_time

    return {
        "algorithm": "rrtstar",
        "path": path,
        "path_length": len(path),
        "compute_time_ms": round(compute_time * 1000, 3)
    }


@app.post("/plan/benchmark")
async def benchmark(mission: MissionRequest):
    """Run both planners on the same mission and compare results head to head."""

    # run A* and time it
    start_time = time.time()
    astar_path = astar.find_path(mission.start, mission.goal, mission.obstacles)
    astar_time = time.time() - start_time

    # run RRT* and time it
    start_time = time.time()
    rrt_path = rrtstar.find_path(mission.start, mission.goal, mission.obstacles)
    rrt_time = time.time() - start_time

    return {
        "astar": {
            "path_length": len(astar_path),
            "compute_time_ms": round(astar_time * 1000, 3)
        },
        "rrtstar": {
            "path_length": len(rrt_path),
            "compute_time_ms": round(rrt_time * 1000, 3)
        },
        # whoever finished faster wins
        "winner": "astar" if astar_time < rrt_time else "rrtstar"
    }


@app.websocket("/ws/telemetry")
async def telemetry(websocket: WebSocket):
    """Stream live drone state to the React frontend at 30Hz via WebSocket."""
    await websocket.accept()
    reader = None
    try:
        reader = SharedMemoryReader("/drone_state")
        while True:
            state = reader.read()
            await websocket.send_json({
                "x": state.x,
                "y": state.y,
                "z": state.z,
                "qx": state.qx,
                "qy": state.qy,
                "qz": state.qz,
                "qw": state.qw,
                "vx": state.vx,
                "vy": state.vy,
                "vz": state.vz,
                "ax": state.ax,
                "ay": state.ay,
                "az": state.az,
            })
            await asyncio.sleep(1/30)
    except Exception:
        # client disconnected - just pass, don't try to close again
        pass
    finally:
        if reader:
            reader.close()