import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
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
app = FastAPI(title="Drone Flight Simulator API", lifespan=lifespan)

# Allow React frontend to connect from any origin (dev mode)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Track selected drone
current_drone = DEFAULT_DRONE


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
    """Bidirectional WebSocket: send telemetry at 30Hz, receive flight input."""
    await websocket.accept()

    async def send_loop():
        """Push drone state to frontend at 30Hz."""
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
            await asyncio.sleep(1 / 30)

    async def recv_loop():
        """Receive flight input from frontend and forward to engine."""
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "flight_input":
                engine_client.send_flight_input(
                    throttle=data.get("throttle", 0.0),
                    pitch=data.get("pitch", 0.0),
                    roll=data.get("roll", 0.0),
                    yaw=data.get("yaw", 0.0),
                )

    try:
        await asyncio.gather(send_loop(), recv_loop())
    except (WebSocketDisconnect, Exception):
        pass


# Serve built frontend assets if FRONTEND_DIR is set
frontend_dir = os.getenv("FRONTEND_DIR")
if frontend_dir and os.path.isdir(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="static")
