import heapq
import math
from .base_planner import BasePlanner

class Astar(BasePlanner):
    def find_path(self, start: tuple[float, float, float], goal: tuple[float, float, float], obstacles: list[tuple[float, float, float]]) -> list[tuple[float, float, float]]:
        """Find shortest path from start to goal avoiding obstacles using A*."""
        # open list: (f_score, position)
        open_list = []
        heapq.heappush(open_list, (0, start))

        # track actual cost from start to each node
        g_scores = {start: 0}

        # track which node led to each node
        came_from = {}

        # already visited nodes
        closed_set = set()

        while open_list:
            current_f, current = heapq.heappop(open_list)

            # reached the goal
            if current == goal:
                path = []
                while current in came_from:
                    path.append(current)
                    current = came_from[current]
                path.append(start)
                path.reverse()
                return path

            closed_set.add(current)

            # explore neighbors
            for dx in [-1, 0, 1]:
                for dy in [-1, 0, 1]:
                    for dz in [-1, 0, 1]:
                        if dx == 0 and dy == 0 and dz == 0:
                            continue

                        neighbor = (current[0] + dx, current[1] + dy, current[2] + dz)

                        if neighbor in closed_set:
                            continue

                        if neighbor in obstacles:
                            continue

                        tentative_g = g_scores[current] + math.sqrt(dx**2 + dy**2 + dz**2)

                        if neighbor not in g_scores or tentative_g < g_scores[neighbor]:
                            g_scores[neighbor] = tentative_g
                            f_score = tentative_g + self._heuristic(neighbor, goal)
                            heapq.heappush(open_list, (f_score, neighbor))
                            came_from[neighbor] = current

        return []  # no path found

    def _heuristic(self, start: tuple[float, float, float], goal: tuple[float, float, float]) -> float:
        """Euclidean distance between two 3D points."""
        return math.sqrt(
            (goal[0] - start[0])**2 +
            (goal[1] - start[1])**2 +
            (goal[2] - start[2])**2
        )