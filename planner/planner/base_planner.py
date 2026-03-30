from abc import ABC, abstractmethod

class BasePlanner(ABC):
    @abstractmethod
    def find_path(self, start: tuple[float, float, float], goal: tuple[float, float, float], obstacles: list[tuple[float, float, float]]):
        pass