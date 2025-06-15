"""
Holds current traffic multiplier (1.0-2.0).
If auto-mode: updates itself using stochastic function each N sim-minutes.
If manual-mode: just exposes the slider value set via Settings API.
"""
import random, math

class TrafficService:
    def __init__(self):
        self.mode = "auto"
        self.manual_mult = 1.0
        self._last_auto_update = 0

    # Route-side setters
    def set_manual(self, m): self.mode, self.manual_mult = "manual", float(m)
    def set_auto(self):      self.mode = "auto"

    def current_multiplier(self) -> float:
        if self.mode == "manual":
            return self.manual_mult
        # simple diurnal curve + noise
        hour = (self._sim_clock_hours() % 24)
        base = 1.0 + 0.5 * math.sin(hour/24*2*math.pi)
        return round(min(2.0, max(1.0, base + random.uniform(-0.1, 0.1))), 2)

    # helper – needs access to sim clock (inject TimeManager if you want)
    def _sim_clock_hours(self): ...
