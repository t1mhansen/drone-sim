# drone-sim

**[Live demo](https://t1mhansen.github.io/drone-sim/)** — runs entirely in the browser.

A drone flight simulator built across three languages. You fly real-world drone profiles (FPV racers, a DJI Mavic, a Shahed-136) with the keyboard over a procedural city, and you can wreck the city while you're at it. Under the hood it's a C++ physics engine running at 1000Hz, a Python server bridging it to the browser over WebSocket, and a React/Three.js frontend drawing everything in 3D.

The engine also compiles to WebAssembly, so it can run entirely in the browser with no backend. That's what the hosted build uses, and it's covered in [Hosting](#hosting).

---

## What it does

- Five drone profiles: FPV Racing, DJI Mavic 3, FPV Kamikaze, DJI Matrice 600, and the Shahed-136. Each one has its own mass, thrust, drag, and lift, so they fly differently.
- Two flight models: rotorcraft (quad/hex/octo) with differential-thrust mixing, and fixed-wing with airspeed-dependent lift, elevator, and rudder.
- Keyboard flight, captured at 30Hz. Hold Space/Shift to climb or descend; let go and throttle eases back to a hover. Pitch, roll, and yaw are momentary. Rotorcraft and fixed-wing use slightly different keys.
- Three cameras: chase, FPV, and orbit. Press C to cycle.
- A procedural city: about 100 buildings, a road grid, and some vehicles, all from a fixed seed so it's the same every run.
- Destructible buildings and drone. Impacts damage both, scaled by mass and speed. Hard hits knock buildings down into rubble; the drone loses integrity and, at zero, blows up and respawns. The kamikaze drones take out a building in one hit and go with it.
- A telemetry HUD: integrity, speed, heading, vertical speed, altitude, position, all streaming at 30Hz.
- Fault injection: kill a rotor mid-flight, reset to recover.

---

## Architecture

```
C++ engine (1000Hz physics)
    |  TCP (binary protocol, port 9001)
Python server (FastAPI)
    |  WebSocket (30Hz telemetry + flight input)
React frontend (Three.js)
```

Three processes talking over TCP. The engine broadcasts drone state and takes commands (throttle, config, flight input, reset). The Python server connects as a TCP client, forwards controls from the browser to the engine, and streams telemetry back. In production it also serves the built frontend.

The frontend doesn't talk to the network directly. It goes through a `SimClient` interface with two implementations:

- `RemoteClient`: the setup above (WebSocket telemetry plus a small REST API). Used for local dev and Docker.
- `WasmClient`: the same engine compiled to WebAssembly, running in the browser with no server. Turned on at build time with `VITE_WASM=1`.

Both drive the same C++ `Simulation` class, which owns the per-tick loop, so the physics is identical whether it runs natively over TCP or as WASM in the tab.

```
                          RemoteClient -> WebSocket/REST -> Python -> TCP -> C++ engine (native)
React frontend -> SimClient
                          WasmClient   -> in-browser ------------------------> C++ engine (WASM)
```

```
drone-sim/
├── engine/                       # C++ physics core (CMake + Emscripten)
│   ├── src/
│   │   ├── DroneState.h          # pos, quat, velocity, angular velocity, health
│   │   ├── DroneConfig.h         # physics params + kamikaze flag
│   │   ├── PhysicsEngine.cpp     # flight models, rotor mixer, fault handling
│   │   ├── WorldCollision.cpp    # building AABBs + impact-based destruction
│   │   ├── Simulation.cpp        # the per-tick loop, shared by native and WASM
│   │   ├── Rotor.cpp             # per-rotor thrust
│   │   ├── RK4Integrator.cpp     # RK4 integration
│   │   ├── TcpServer.cpp         # cross-platform TCP + event broadcast
│   │   ├── CommandChannel.h      # command + flight input structs
│   │   ├── main.cpp              # native loop, drives Simulation over TCP
│   │   ├── wasm_api.cpp          # C API exported to WebAssembly
│   │   └── Logger.cpp            # JSON flight log
│   ├── tests/test_collision.cpp  # destruction-model tests
│   └── build_wasm.sh             # builds frontend/src/wasm/engine.mjs
├── planner/                      # Python server
│   ├── api/server.py             # FastAPI, WebSocket, event stream
│   ├── tcp_client.py             # TCP client to the engine
│   ├── drone_profiles.py         # the five drone presets
│   └── models/drone_state.py     # DroneState dataclass
└── frontend/                     # React/TypeScript (Vite)
    └── src/
        ├── components/
        │   ├── Scene3D.tsx        # composes scene, cameras, effects
        │   ├── scene/             # drone meshes, cameras, explosions
        │   ├── UrbanEnvironment   # city, plus rubble for destroyed buildings
        │   └── …                  # HUD, minimap, selector, fault panel
        ├── sim/                   # SimClient: RemoteClient, WasmClient, profiles
        ├── world/worldGen.ts      # city generator (kept in sync with the engine)
        ├── wasm/engine.mjs        # prebuilt WASM engine (checked in)
        └── hooks/                 # useTelemetry, useFlightControls
```

---

## The physics

A drone carries 13 dynamics variables (position, orientation quaternion, linear velocity, angular velocity) plus a health value for damage. Integration is RK4 at a 1ms timestep.

Rotorcraft: each rotor produces `thrust = throttle * maxThrust`. A mixer turns pitch/roll/yaw into per-rotor thrust differences based on where each rotor sits. Pitch and roll tilt the drone to move it horizontally, and a little vertical drag keeps climbs and descents from drifting.

Fixed-wing: a single engine pushes thrust along the velocity vector. Lift scales with airspeed squared (`lift = liftCoeff * v²`). Pitch is the elevator, yaw is the rudder, and it stalls if it gets too slow.

The profiles differ in mass, rotor count, max thrust, drag, and lift. A heavy-lift Matrice (6 rotors, 10kg) flies nothing like an FPV racer (4 rotors, 0.4kg) or a Shahed-136 (fixed-wing, 200kg).

---

## Controls

Rotorcraft (quad, hex, octo):

| Key | Action |
|-----|--------|
| W / S | Pitch forward / back |
| A / D | Roll left / right |
| Q / E | Yaw left / right |
| Space | Throttle up |
| Shift | Throttle down |
| C | Cycle camera |

Fixed-wing (Shahed-136):

| Key | Action |
|-----|--------|
| W / S | Pitch up / down (elevator) |
| A / D | Yaw left / right (rudder) |
| Space | Throttle up |
| Shift | Throttle down |
| C | Cycle camera |

---

## Getting started

You'll need CMake 3.20+, a C++17 compiler, Python 3.11+, and Node 18+. It runs on macOS, Linux, and Windows.

### C++ engine

```bash
cd engine
mkdir build && cd build
cmake ..
make          # or cmake --build . on Windows
./drone_sim_engine
```

It listens on TCP port 9001. Set `ENGINE_PORT` to change that.

There are a few tests for the destruction model (no test framework, just asserts):

```bash
cd engine/build
cmake .. && make test_collision && ./test_collision   # or: ctest
```

### Python server

```bash
cd planner
python3 -m venv .venv
source .venv/bin/activate   # .venv\Scripts\activate on Windows
pip install -r requirements.txt
python3 -m uvicorn api.server:app --port 8000
```

Set `ENGINE_HOST` and `ENGINE_PORT` if the engine is somewhere else.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The dev server proxies to the Python backend.

### Docker

```bash
docker-compose up --build
```

Open `http://localhost:8000`. The planner builds the frontend into its image and serves it.

---

## Hosting

Two ways to deploy, depending on what you want. `docker-compose up --build` runs the real stack — C++ engine, Python server, React frontend — and serves it on `:8000`. The other way skips the backend entirely: build the WebAssembly version and drop it on any static host. That's what the demo link uses, and it's what the rest of this section covers.

The WebAssembly build runs the whole thing in the browser, so you can host it as a plain static site with no backend to keep alive.

```bash
cd frontend
npm install
npm run build:wasm     # outputs frontend/dist
```

`frontend/dist` is self-contained, so it'll work on any static host. There are configs for the common ones:

- Vercel: `vercel.json`. Import the repo and deploy.
- Netlify: `netlify.toml`. Import the repo and deploy.
- GitHub Pages or anything else: serve `frontend/dist`.

The compiled engine (`frontend/src/wasm/engine.mjs`) is checked in, so the host doesn't need Emscripten. You only rebuild it when you change the C++:

```bash
# one-time: install Emscripten
git clone https://github.com/emscripten-core/emsdk.git ~/emsdk
~/emsdk/emsdk install latest && ~/emsdk/emsdk activate latest

source ~/emsdk/emsdk_env.sh
cd engine && ./build_wasm.sh
```

One thing to keep straight: `npm run build` (no `:wasm`) is the backend-served build Docker uses, where the frontend talks to the stack serving it. `npm run build:wasm` is the standalone one that runs the engine in the browser.

---

## Demo

1. Start the three services, or just `docker-compose up`.
2. The drone spawns at 100m over the city.
3. Pick a drone from the selector. Each shows its real specs and trade-offs.
4. Fly with WASD. The controls HUD shows the active keys and throttle.
5. Press C to switch between chase, FPV, and orbit cameras.
6. Try the Shahed-136. It's fixed-wing, so it needs speed to stay up.
7. Fly a kamikaze into a building and watch it come down. Heavier drones just dent things and lose integrity instead.
8. Use fault injection to kill a rotor and see how the drone reacts.

---

## Built with

- C++17, CMake, cross-platform TCP sockets, Emscripten / WebAssembly
- Python 3, FastAPI, WebSocket
- React, TypeScript, Vite, Three.js, @react-three/fiber
