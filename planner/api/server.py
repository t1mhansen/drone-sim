import os
import time
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from planner.astar import Astar
from planner.rrt_star import Rrtstar
from database.db import init_db, SessionLocal, MissionRecord, FlightLog
from tcp_client import EngineClient
from drone_profiles import PROFILES, DEFAULT_DRONE

# Engine connection config from environment
ENGINE_HOST = os.getenv("ENGINE_HOST", "localhost")
ENGINE_PORT = int(os.getenv("ENGINE_PORT", "9001"))

# Singleton engine client
engine_client = EngineClient(ENGINE_HOST, ENGINE_PORT)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Connect to engine on startup, disconnect on shutdown."""
    engine_client.connect()
    engine_client.start()
    yield
    engine_client.close()


# Create FastAPI app
app = FastAPI(title="Drone Sim Planner API", lifespan=lifespan)

# Allow React frontend to connect from any origin (dev mode)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic model for mission requests
class MissionRequest(BaseModel):
    start: tuple[float, float, float]
    goal: tuple[float, float, float]
    obstacles: list[tuple[float, float, float]]

# Initialize both planners once at startup
astar = Astar()
rrtstar = Rrtstar()

# Track selected drone
current_drone = DEFAULT_DRONE

# Initialize database on startup
init_db()


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/drones")
async def list_drones():
    """List all available drone profiles with specs."""
    return {
        "drones": {
            key: {
                "name": p["name"],
                "type": "fixed_wing" if p["type"] == 1 else "rotorcraft",
                "description": p["description"],
                "pros": p["pros"],
                "cons": p["cons"],
                "specs": p["specs"],
                "physics": {
                    "mass": p["mass"],
                    "num_rotors": p["num_rotors"],
                    "max_thrust_per_rotor": p["max_thrust_per_rotor"],
                    "drag_coeff": p["drag_coeff"],
                    "lift_coeff": p["lift_coeff"],
                },
            }
            for key, p in PROFILES.items()
        },
        "current": current_drone,
    }


@app.post("/drone/select/{drone_id}")
async def select_drone(drone_id: str):
    """Switch the active drone. Sends new config to C++ engine."""
    global current_drone
    if drone_id not in PROFILES:
        return {"error": f"Unknown drone: {drone_id}", "available": list(PROFILES.keys())}

    profile = PROFILES[drone_id]
    engine_client.send_config(
        drone_type=profile["type"],
        num_rotors=profile["num_rotors"],
        mass=profile["mass"],
        max_thrust_per_rotor=profile["max_thrust_per_rotor"],
        drag_coeff=profile["drag_coeff"],
        lift_coeff=profile["lift_coeff"],
    )
    current_drone = drone_id
    return {"status": "drone selected", "drone": profile["name"]}


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
    start_time = time.time()
    astar_path = astar.find_path(mission.start, mission.goal, mission.obstacles)
    astar_time = time.time() - start_time

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
        "winner": "astar" if astar_time < rrt_time else "rrtstar"
    }


@app.post("/mission/save")
async def save_mission(mission: MissionRequest):
    """Run A* and save the mission and result to SQLite."""
    start_time = time.time()
    path = astar.find_path(mission.start, mission.goal, mission.obstacles)
    compute_time = time.time() - start_time

    db = SessionLocal()
    try:
        record = MissionRecord(
            algorithm='astar',
            start_x=mission.start[0],
            start_y=mission.start[1],
            start_z=mission.start[2],
            goal_x=mission.goal[0],
            goal_y=mission.goal[1],
            goal_z=mission.goal[2],
            path_length=len(path),
            compute_time_ms=round(compute_time * 1000, 3)
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return {
            "mission_id": record.id,
            "path": path,
            "path_length": len(path),
            "compute_time_ms": record.compute_time_ms
        }
    finally:
        db.close()


@app.get("/missions")
async def get_missions():
    """Get all saved missions from SQLite."""
    db = SessionLocal()
    try:
        missions = db.query(MissionRecord).all()
        return [{
            "id": m.id,
            "algorithm": m.algorithm,
            "path_length": m.path_length,
            "compute_time_ms": m.compute_time_ms
        } for m in missions]
    finally:
        db.close()


@app.post("/fault/kill_rotor/{rotor_index}")
async def kill_rotor(rotor_index: int):
    """Kill a specific rotor to simulate motor failure."""
    if rotor_index < 0 or rotor_index > 3:
        return {"error": "rotor_index must be 0-3"}
    engine_client.send_set_throttle(rotor_index, 0.0)
    return {"status": "rotor killed", "rotor": rotor_index}


@app.post("/fault/reset")
async def reset_rotors():
    """Restore all rotors to hover throttle."""
    engine_client.send_reset()
    return {"status": "rotors reset to hover"}


@app.websocket("/ws/telemetry")
async def telemetry(websocket: WebSocket):
    """Stream live drone state to the React frontend at 30Hz via WebSocket."""
    await websocket.accept()
    try:
        while True:
            state = engine_client.read_state()
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
        pass


# Serve built frontend assets if FRONTEND_DIR is set
frontend_dir = os.getenv("FRONTEND_DIR")
if frontend_dir and os.path.isdir(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="static")
