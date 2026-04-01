#include "WorldCollision.h"
#include <cmath>
#include <algorithm>
#include <limits>

WorldCollision::WorldCollision() : seed(42) {
    generateBuildings();
}

void WorldCollision::generateBuildings() {
    // Must exactly match UrbanEnvironment.tsx generation
    constexpr int blockSize = 60;
    constexpr int roadWidth = 18;
    constexpr int gridRange = 4;

    for (int bx = -gridRange; bx < gridRange; bx++) {
        for (int bz = -gridRange; bz < gridRange; bz++) {
            double blockCenterX = bx * (blockSize + roadWidth);
            double blockCenterZ = bz * (blockSize + roadWidth);

            int numBuildings = 1 + static_cast<int>(std::floor(nextRandom() * 3));
            for (int i = 0; i < numBuildings; i++) {
                double w = 12.0 + nextRandom() * 28.0;
                double d = 12.0 + nextRandom() * 28.0;
                double h = 12.0 + nextRandom() * 65.0;
                double offsetX = (nextRandom() - 0.5) * (blockSize - w) * 0.8;
                double offsetZ = (nextRandom() - 0.5) * (blockSize - d) * 0.8;

                double cx = blockCenterX + offsetX;
                double cz = blockCenterZ + offsetZ;

                // In Three.js: building at [cx, h/2, cz] with dims [w, h, d]
                // In drone state coords: x=cx, y=cz (Three.js Z = drone Y)
                buildings.push_back({
                    cx - w / 2.0, cx + w / 2.0,  // minX, maxX
                    cz - d / 2.0, cz + d / 2.0,  // minY, maxY
                    h                              // height (0 to h)
                });

                // Consume the color randoms to stay in sync with JS
                nextRandom(); // building color
                nextRandom(); // window color
            }
        }
    }
}

void WorldCollision::resolveCollisions(DroneState& state) {
    // Ground collision
    if (state.z < 0.0) {
        state.z = 0.0;
        state.vz = 0.0;
    }

    // Building AABB collisions
    for (const auto& b : buildings) {
        // Check if drone is inside this building's AABB
        if (state.x > b.minX && state.x < b.maxX &&
            state.y > b.minY && state.y < b.maxY &&
            state.z < b.height && state.z >= 0.0) {

            // Find minimum penetration axis to push out
            double penLeft  = state.x - b.minX;
            double penRight = b.maxX - state.x;
            double penFront = state.y - b.minY;
            double penBack  = b.maxY - state.y;
            double penTop   = b.height - state.z;

            double minPen = penLeft;
            int axis = 0; // 0=left, 1=right, 2=front, 3=back, 4=top

            if (penRight < minPen) { minPen = penRight; axis = 1; }
            if (penFront < minPen) { minPen = penFront; axis = 2; }
            if (penBack  < minPen) { minPen = penBack;  axis = 3; }
            if (penTop   < minPen) { minPen = penTop;   axis = 4; }

            switch (axis) {
                case 0: // push left (−X)
                    state.x = b.minX;
                    if (state.vx > 0) state.vx = 0;
                    break;
                case 1: // push right (+X)
                    state.x = b.maxX;
                    if (state.vx < 0) state.vx = 0;
                    break;
                case 2: // push front (−Y)
                    state.y = b.minY;
                    if (state.vy > 0) state.vy = 0;
                    break;
                case 3: // push back (+Y)
                    state.y = b.maxY;
                    if (state.vy < 0) state.vy = 0;
                    break;
                case 4: // push up (on top of building)
                    state.z = b.height;
                    if (state.vz < 0) state.vz = 0;
                    break;
            }
        }
    }
}
