from abc import ABC, abstractmethod

class BasePlanner(ABC):
    """Abstract base class for all path planners."""

    @abstractmethod
    def find_path(self, start: tuple[float, float, float], goal: tuple[float, float, float], obstacles: list[tuple[float, float, float]]) -> list[tuple[float, float, float]]:
        """Find a path from start to goal avoiding obstacles.

        Args:
            start: Starting position (x, y, z)
            goal: Goal position (x, y, z)
            obstacles: List of obstacle positions (x, y, z)

        Returns:
            List of positions representing the path
        """
        pass