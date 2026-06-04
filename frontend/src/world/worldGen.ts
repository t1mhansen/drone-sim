// Single source of truth for the procedural city on the frontend.
//
// This MUST stay in lockstep with the C++ engine's WorldCollision::generateBuildings
// (same constants, same loop order, same Park-Miller PRNG seeded at 42). The Nth
// building produced here is the Nth building the engine tracks for collision, so a
// building's array index is its stable id — that's what destruction events reference.
//
// Previously this logic was copy-pasted into UrbanEnvironment and Minimap; both now
// import from here.

export const WORLD = {
    BLOCK_SIZE: 60,
    ROAD_WIDTH: 18,
    GRID_RANGE: 4,
    SEED: 42,
} as const;

export interface Building {
    x: number;
    z: number;
    w: number;
    d: number;
    h: number;
    color: string;
    windowColor: string;
}

export interface Vehicle {
    x: number;
    z: number;
    rot: number;
    color: string;
}

const BUILDING_COLORS = [
    '#606878', '#586068', '#687078', '#505860', '#707880',
    '#5a6470', '#646e78', '#4e5660', '#6a7480', '#586270',
];

const WINDOW_COLORS = [
    '#aabb44', '#88aa33', '#99bb55', '#77aa22', '#bbcc66',
];

const VEHICLE_COLORS = [
    '#8b3030', '#6b4040', '#7b3535', '#5b2020', '#9b4545',
];

function seededRandom(seed: number) {
    let s = seed;
    return () => {
        s = (s * 16807 + 0) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

export function generateCity(): { buildings: Building[]; vehicles: Vehicle[] } {
    const { BLOCK_SIZE, ROAD_WIDTH, GRID_RANGE, SEED } = WORLD;
    const rand = seededRandom(SEED);
    const buildings: Building[] = [];
    const vehicles: Vehicle[] = [];

    for (let bx = -GRID_RANGE; bx < GRID_RANGE; bx++) {
        for (let bz = -GRID_RANGE; bz < GRID_RANGE; bz++) {
            const blockCenterX = bx * (BLOCK_SIZE + ROAD_WIDTH);
            const blockCenterZ = bz * (BLOCK_SIZE + ROAD_WIDTH);

            const numBuildings = 1 + Math.floor(rand() * 3);
            for (let i = 0; i < numBuildings; i++) {
                const w = 12 + rand() * 28;
                const d = 12 + rand() * 28;
                const h = 12 + rand() * 65;
                const offsetX = (rand() - 0.5) * (BLOCK_SIZE - w) * 0.8;
                const offsetZ = (rand() - 0.5) * (BLOCK_SIZE - d) * 0.8;

                buildings.push({
                    x: blockCenterX + offsetX,
                    z: blockCenterZ + offsetZ,
                    w, d, h,
                    color: BUILDING_COLORS[Math.floor(rand() * BUILDING_COLORS.length)],
                    windowColor: WINDOW_COLORS[Math.floor(rand() * WINDOW_COLORS.length)],
                });
            }
        }
    }

    // Vehicles on roads (engine doesn't track these — order after buildings only).
    for (let i = 0; i < 25; i++) {
        const onVerticalRoad = rand() > 0.5;
        const blockIdx = Math.floor(rand() * GRID_RANGE * 2) - GRID_RANGE;
        const along = (rand() - 0.5) * GRID_RANGE * 2 * (BLOCK_SIZE + ROAD_WIDTH);
        const roadCenter = blockIdx * (BLOCK_SIZE + ROAD_WIDTH) + BLOCK_SIZE / 2 + ROAD_WIDTH / 2;
        const laneOffset = (rand() - 0.5) * 6;

        vehicles.push({
            x: onVerticalRoad ? roadCenter + laneOffset : along,
            z: onVerticalRoad ? along : roadCenter + laneOffset,
            rot: onVerticalRoad ? 0 : Math.PI / 2,
            color: VEHICLE_COLORS[Math.floor(rand() * VEHICLE_COLORS.length)],
        });
    }

    return { buildings, vehicles };
}
