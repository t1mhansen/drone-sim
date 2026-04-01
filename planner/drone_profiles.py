DRONE_TYPE_ROTORCRAFT = 0
DRONE_TYPE_FIXED_WING = 1

PROFILES = {
    "fpv_racing": {
        "name": "FPV Racing Drone",
        "type": DRONE_TYPE_ROTORCRAFT,
        "num_rotors": 4,
        "mass": 0.4,
        "max_thrust_per_rotor": 5.0,
        "drag_coeff": 0.1,
        "lift_coeff": 0.0,
        "description": "Ultra-light racing quadcopter built for speed and agility. "
                       "Thrust-to-weight ratio over 5:1 enables extreme maneuvers.",
        "pros": [
            "Extreme agility and acceleration",
            "Top speed ~160 km/h",
            "Small and hard to detect",
        ],
        "cons": [
            "~3 min flight time",
            "No GPS stabilization",
            "Limited payload capacity",
        ],
        "specs": {
            "max_speed": "160 km/h",
            "range": "~2 km",
            "endurance": "3-5 min",
            "cost": "~$300",
        },
    },
    "dji_mavic": {
        "name": "DJI Mavic 3 (Recon)",
        "type": DRONE_TYPE_ROTORCRAFT,
        "num_rotors": 4,
        "mass": 0.895,
        "max_thrust_per_rotor": 4.5,
        "drag_coeff": 0.05,
        "lift_coeff": 0.0,
        "description": "Commercial reconnaissance drone with excellent camera stabilization. "
                       "GPS waypoint navigation and obstacle avoidance built in.",
        "pros": [
            "46 min flight time",
            "4/3 CMOS Hasselblad camera",
            "Omnidirectional obstacle sensing",
        ],
        "cons": [
            "Moderate speed (~75 km/h)",
            "Not hardened for combat",
            "Easily jammed (commercial GPS/radio)",
        ],
        "specs": {
            "max_speed": "75 km/h",
            "range": "~30 km (signal)",
            "endurance": "46 min",
            "cost": "~$2,000",
        },
    },
    "fpv_kamikaze": {
        "name": "FPV Kamikaze (Ukraine)",
        "type": DRONE_TYPE_ROTORCRAFT,
        "num_rotors": 4,
        "mass": 1.5,
        "max_thrust_per_rotor": 9.81,
        "drag_coeff": 0.08,
        "lift_coeff": 0.0,
        "description": "Modified FPV drone carrying a warhead, widely used in the Ukraine conflict. "
                       "Operator flies via first-person video into the target. One-way trip.",
        "pros": [
            "Extremely low cost (~$400)",
            "Precision strike via FPV",
            "Devastating against armor and personnel",
        ],
        "cons": [
            "One-way (expendable)",
            "~10 km range",
            "Vulnerable to electronic warfare",
        ],
        "specs": {
            "max_speed": "120 km/h",
            "range": "~10 km",
            "endurance": "10-15 min",
            "cost": "~$400",
        },
    },
    "heavy_lift": {
        "name": "DJI Matrice 600 (Heavy Lift)",
        "type": DRONE_TYPE_ROTORCRAFT,
        "num_rotors": 6,
        "mass": 10.0,
        "max_thrust_per_rotor": 25.0,
        "drag_coeff": 0.15,
        "lift_coeff": 0.0,
        "description": "Professional hexacopter for heavy payloads. Used for cinema cameras, "
                       "LiDAR mapping, and industrial inspection. Extremely stable platform.",
        "pros": [
            "6 kg payload capacity",
            "Redundant motors (can lose one)",
            "A3 Pro flight controller (cm-level precision)",
        ],
        "cons": [
            "Slow (~65 km/h)",
            "Large profile, easy to spot",
            "Expensive and complex",
        ],
        "specs": {
            "max_speed": "65 km/h",
            "range": "~5 km",
            "endurance": "16-38 min (payload dependent)",
            "cost": "~$6,000",
        },
    },
    "shahed_136": {
        "name": "Shahed-136 (Loitering Munition)",
        "type": DRONE_TYPE_FIXED_WING,
        "num_rotors": 1,
        "mass": 200.0,
        "max_thrust_per_rotor": 500.0,
        "drag_coeff": 0.002,
        "lift_coeff": 0.04,
        "description": "Iranian-designed delta-wing loitering munition used extensively in the "
                       "Ukraine conflict. Launched from a rack, flies autonomously via GPS to "
                       "target coordinates. Cannot hover — must maintain airspeed for lift.",
        "pros": [
            "2,500 km range",
            "Low cost for damage inflicted (~$20-50k)",
            "Swarm-capable (launched in waves)",
        ],
        "cons": [
            "Cannot hover or loiter precisely",
            "Slow (~185 km/h), vulnerable to air defense",
            "No return capability (one-way)",
        ],
        "specs": {
            "max_speed": "185 km/h",
            "range": "~2,500 km",
            "endurance": "hours",
            "cost": "~$20,000-50,000",
        },
    },
}

DEFAULT_DRONE = "fpv_kamikaze"
