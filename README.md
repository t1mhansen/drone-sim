# drone-sim

A full-stack autonomous drone simulation platform built across three languages, each chosen for where it actually makes sense. The core is a C++ physics engine running at 1000Hz, a Python backend handling path planning and a REST/WebSocket API, and a React/TypeScript frontend that renders everything live in 3D.

---

## What it does

- **Physics simulation** — 6-DOF rigid body simulation with rotor thrust modeling and an RK4 integrator for numerical stability.
- **Path planning** — A* and RRT* planners running head-to-head on the same missions, with a benchmarking API that compares path length and compute time.
- **Live telemetry** — Drone state streams from C++ → Python → React over WebSocket at 30Hz, downsampled from the 1000Hz physics loop.
- **Mission designer** — Place waypoints and obstacles, select an algorithm, launch. The planned path renders as a line in the 3D scene alongside obstacle visualization.
- **Fault injection** — Kill individual rotors mid-flight and watch the drone respond. Hit reset and it recovers.
- **Mission persistence** — Missions saved to SQLite.

---

## Architecture

```
C++ Engine (1000Hz)
    |  TCP socket (port 9001)
Python Planner (FastAPI)
    |  WebSocket @ 30Hz
React Frontend (Three.js)
```

Three separate processes communicating over TCP. The engine broadcasts drone state to connected clients and accepts commands. The Python planner connects as a TCP client, serves the REST/WebSocket API, and in production also serves the built frontend assets.

```
drone-sim/
├── engine/                       # C++ physics core (CMake)
│   └── src/
│       ├── DroneState.h          # 6-DOF state representation
│       ├── PhysicsEngine.cpp     # gravity, thrust, RK4 integration
│       ├── Rotor.cpp             # thrust model
│       ├── RK4Integrator.cpp     # numerical integration
│       ├── TcpServer.cpp         # cross-platform TCP IPC
│       ├── CommandChannel.h      # command type definitions
│       └── Logger.cpp            # JSON flight logging
├── planner/                      # Python planning service
│   ├── planner/
│   │   ├── astar.py              # A* path planner
│   │   └── rrt_star.py           # RRT* path planner
│   ├── api/
│   │   └── server.py             # FastAPI + WebSocket + static file serving
│   ├── database/
│   │   └── db.py                 # SQLite via SQLAlchemy
│   └── tcp_client.py             # TCP client to C++ engine
└── frontend/                     # React/TypeScript (Vite)
    └── src/
        ├── components/
        │   ├── Scene3D.tsx        # Three.js 3D scene with obstacles
        │   ├── TelemetryHUD.tsx   # live telemetry overlay
        │   ├── MissionPlanner.tsx # waypoint/obstacle UI
        │   └── FaultInjection.tsx # rotor kill/reset panel
        └── hooks/
            └── useTelemetry.ts    # WebSocket hook with reconnection
```


## The physics

The drone is modeled as a rigid body with 13 state variables:

- **Position** — x, y, z in meters
- **Orientation** — quaternion (qx, qy, qz, qw) to avoid gimbal lock
- **Linear velocity** — vx, vy, vz in m/s
- **Angular velocity** — ax, ay, az in rad/s

Each rotor produces thrust proportional to throttle: `thrust = throttle × maxThrust`. Net vertical acceleration is `(totalThrust / mass) - g`.

Integration uses RK4 rather than Euler. The difference is measurable — free fall from 100m gives `95.0999m` with Euler vs the theoretical `95.095m` with RK4. Small over one second, significant over a long flight.

---

## Getting started

### Prerequisites

- CMake 3.20+
- C++17 compiler (clang++, g++, or MSVC)
- Python 3.11+
- Node.js 18+

Works on **macOS**, **Linux**, and **Windows**.

### C++ engine

```bash
cd engine
mkdir build && cd build
cmake ..
make          # or cmake --build . on Windows
./drone_sim_engine
```

The engine listens on TCP port 9001 by default. Set `ENGINE_PORT` to change it.

### Python planner

```bash
cd planner
python3 -m venv .venv
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
python3 -m uvicorn api.server:app --port 8000
```

Set `ENGINE_HOST` and `ENGINE_PORT` if the engine is on a different host.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies API requests to the Python backend automatically.

### Docker

```bash
docker-compose up --build
```

Open `http://localhost:8000`. Everything is served from port 8000 — the planner builds the frontend into its image and serves it as static files. No `ipc: host` required.

---

## Demo

1. Start all three services (or just `docker-compose up`)
2. The drone appears in the 3D scene hovering at 100m
3. Use the **Mission Planner** panel to set waypoints and obstacles, select A* or RRT*, and launch — the planned path renders as a yellow line, obstacles appear as red spheres
4. Use the **Fault Injection** panel to kill a rotor — the drone falls under gravity
5. Hit **Reset** to restore hover

The **benchmark endpoint** at `/plan/benchmark` runs both planners on the same mission and returns a head-to-head comparison of path length and compute time.

---

## Things I'd add with more time

- Kalman filter for state estimation — bridging the gap between simulation and real sensor noise
- Replay UI — the flight logs are already in SQLite, just needs a frontend scrubber
- Split-view planner comparison — A* and RRT* running simultaneously on the same mission

---

## Built with

- C++17, CMake, cross-platform TCP sockets
- Python 3, FastAPI, SQLAlchemy
- React, TypeScript, Vite, Three.js, @react-three/fiber
