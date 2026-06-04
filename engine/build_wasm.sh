#!/usr/bin/env bash
# Compile the simulation core to a self-contained WebAssembly ES module that the
# frontend loads to run the whole sim in-browser (no Python/TCP backend).
#
# Requires the Emscripten SDK on PATH. If you installed emsdk in the default
# location, activate it first:
#   source ~/emsdk/emsdk_env.sh
#
# Output: frontend/src/wasm/engine.mjs  (wasm is embedded via SINGLE_FILE).
set -euo pipefail

cd "$(dirname "$0")"
OUT_DIR="../frontend/src/wasm"
mkdir -p "$OUT_DIR"

emcc -O3 -std=c++17 \
  src/PhysicsEngine.cpp \
  src/Rotor.cpp \
  src/RK4Integrator.cpp \
  src/WorldCollision.cpp \
  src/Simulation.cpp \
  src/wasm_api.cpp \
  -o "$OUT_DIR/engine.mjs" \
  -s MODULARIZE=1 \
  -s EXPORT_ES6=1 \
  -s ENVIRONMENT=web \
  -s SINGLE_FILE=1 \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s 'EXPORTED_FUNCTIONS=["_sim_init","_sim_set_config","_sim_set_flight_input","_sim_kill_rotor","_sim_restore_rotor","_sim_reset","_sim_step","_sim_state_ptr","_sim_event_count","_sim_events_ptr"]' \
  -s 'EXPORTED_RUNTIME_METHODS=["HEAPF64"]'

echo "Built $OUT_DIR/engine.mjs"
