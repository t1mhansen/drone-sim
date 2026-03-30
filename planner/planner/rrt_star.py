import math
import random
from .base_planner import BasePlanner

class Rrtstar(BasePlanner):
    def __init__(self, max_iterations: int = 1000, step_size: float = 1.0, goal_tolerance: float = 1.0, rewire_radius: float = 2.0):
        """RRT* (Rapidly-exploring Random Tree optimal) path planner.
        Probabilistically samples the space to find an optimal path,
        continuously rewiring to improve path quality."""
        self.max_iterations = max_iterations
        self.step_size = step_size
        self.goal_tolerance = goal_tolerance
        self.rewire_radius = rewire_radius

    def find_path(self, start: tuple[float, float, float], goal: tuple[float, float, float], obstacles: list[tuple[float, float, float]]) -> list[tuple[float, float, float]]:
        """Find path from start to goal using RRT* algorithm."""

        # tree nodes and their relationships
        nodes = [start]
        parent = {start: None}  # start has no parent - it's the root
        cost = {start: 0.0}     # cost to reach start is zero

        for _ in range(self.max_iterations):

            # sample a random point in space
            # 10% of the time sample the goal directly to bias toward it
            if random.random() < 0.1:
                random_point = goal
            else:
                random_point = (
                    random.uniform(-50, 50),  # x
                    random.uniform(-50, 50),  # y
                    random.uniform(0, 100)    # z (altitude)
                )

            # find the nearest node in the tree to the random point
            nearest = min(nodes, key=lambda n: self._distance(n, random_point))

            # steer from nearest toward random point by step_size
            new_point = self._steer(nearest, random_point)

            # skip if new point collides with an obstacle
            if not self._is_collision_free(new_point, obstacles):
                continue

            # find all nodes within rewire_radius of the new point
            nearby_nodes = [n for n in nodes if self._distance(n, new_point) < self.rewire_radius]

            # find the best parent - the nearby node that gives lowest cost to new_point
            best_parent = nearest
            best_cost = cost[nearest] + self._distance(nearest, new_point)

            for node in nearby_nodes:
                new_cost = cost[node] + self._distance(node, new_point)
                if new_cost < best_cost:
                    best_cost = new_cost
                    best_parent = node

            # add new point to the tree
            nodes.append(new_point)
            parent[new_point] = best_parent
            cost[new_point] = best_cost

            # rewire nearby nodes if going through new_point is cheaper
            for node in nearby_nodes:
                new_cost = cost[new_point] + self._distance(new_point, node)
                if new_cost < cost[node]:
                    parent[node] = new_point
                    cost[node] = new_cost

            # check if we can reach the goal from the new point
            if self._distance(new_point, goal) < self.goal_tolerance:
                # reconstruct path by following parents back to start
                path = []
                current = new_point
                while current is not None:
                    path.append(current)
                    current = parent[current]
                path.reverse()
                path.append(goal)
                return path

        # no path found within max_iterations
        return []

    def _distance(self, a: tuple[float, float, float], b: tuple[float, float, float]) -> float:
        """Euclidean distance between two 3D points."""
        return math.sqrt(
            (b[0] - a[0])**2 +
            (b[1] - a[1])**2 +
            (b[2] - a[2])**2
        )

    def _steer(self, from_point: tuple[float, float, float], to_point: tuple[float, float, float]) -> tuple[float, float, float]:
        """Move from from_point toward to_point by step_size.
        If the target is closer than step_size, return it directly."""
        dist = self._distance(from_point, to_point)

        # if already within one step, just go straight to the target
        if dist < self.step_size:
            return to_point

        # calculate the unit vector (direction) from from_point to to_point
        # then scale it by step_size to get exactly one step
        ratio = self.step_size / dist
        return (
            from_point[0] + ratio * (to_point[0] - from_point[0]),  # x
            from_point[1] + ratio * (to_point[1] - from_point[1]),  # y
            from_point[2] + ratio * (to_point[2] - from_point[2])   # z
        )

    def _is_collision_free(self, point: tuple[float, float, float], obstacles: list[tuple[float, float, float]]) -> bool:
        """Check if a point is not too close to any obstacle.
        Returns True if the point is safe, False if it collides."""
        for obstacle in obstacles:
            # if point is within step_size distance of any obstacle, it's a collision
            if self._distance(point, obstacle) < self.step_size:
                return False

        # no obstacles nearby, point is safe
        return True