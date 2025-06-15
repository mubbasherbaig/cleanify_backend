"""
Keeps track of simulation clock, speed multiplier, pause state.
Does **not** know about traffic or trucks – single responsibility!
"""
import time
from datetime import datetime, timedelta

class TimeManager:
    def __init__(self):
        self.speed = 1
        self.is_paused = False
        self._sim_time = datetime.now()
        self._real_last = time.perf_counter()

    # --- Public API -------------------------------------------------------

    def set_speed(self, factor: int) -> None:
        self.speed = max(1, min(10, factor))

    def pause(self):  self.is_paused = True
    def resume(self): self.is_paused = False

    def now(self) -> datetime:
        """
        Returns current simulation time, advancing internal state
        based on real wall-clock passed since last call.
        """
        if self.is_paused:
            return self._sim_time

        real_now   = time.perf_counter()
        real_delta = real_now - self._real_last
        self._real_last = real_now

        self._sim_time += timedelta(seconds=real_delta * self.speed)
        return self._sim_time
