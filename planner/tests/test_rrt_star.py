from planner.rrt_star import Rrtstar

planner = Rrtstar()
start = (0, 0, 0)
goal = (5, 5, 5)
obstacles = [(2, 2, 2), (3, 3, 3)]

path = planner.find_path(start, goal, obstacles)
print(f"Path found: {path}")
print(f"Path length: {len(path)} steps")