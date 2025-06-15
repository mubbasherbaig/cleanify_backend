"""
Main game-loop.
Own thread/greenlet → periodically:
    1. Advance sim time
    2. Ask OptimizationService if any action needed
    3. Move trucks (respect traffic multiplier)
    4. Collect bins that were reached
    5. Emit updated state via SocketIO
"""
import threading, time
from typing import List
from cleanify.core.utils.time_manager import TimeManager
from cleanify.core.models.truck import Truck
from .traffic_service import TrafficService
from .optimization_service import OptimizationService

class SimulationService(threading.Thread):
    TICK_REAL_SECONDS = 0.2            # 5 Hz loop (change if heavy)

    def __init__(self, sio):
        super().__init__(daemon=True)
        self.sio = sio
        self.time_manager      = TimeManager()
        self.traffic_service   = TrafficService()
        self.optimization_svc  = OptimizationService(self.traffic_service)
        self._running = False

        # TEMP seed data – replace w/ DB later
        self.trucks: List[Truck] = self._bootstrap_demo_trucks()

    # ---------- Thread controls -----------------

    def run(self):
        self._running = True
        while self._running:
            sim_now = self.time_manager.now()
            self._step(sim_now)
            time.sleep(self.TICK_REAL_SECONDS)

    def pause(self):   self.time_manager.pause()
    def resume(self):  self.time_manager.resume()
    def stop(self):    self._running = False

    def set_speed(self, s: int): self.time_manager.set_speed(s)

    # ---------- Inner loop ----------------------

    def _step(self, sim_now):
        """
        Core logic per tick – VERY high-level; delegate details out.
        """
        self._move_trucks()
        self.optimization_svc.maybe_reoptimize(self.trucks)
        # Emit snapshot to FE
        self.sio.emit("simulation_tick", self._snapshot(sim_now))

    # ---------------- helper --------------------

    def _move_trucks(self):
        """
        Advance each truck along its route, respecting current traffic multiplier.
        """
        traffic = self.traffic_service.current_multiplier()
        # ... do per-truck movement / load update …

    def _snapshot(self, sim_now):
        """
        Build lightweight dict (no ORM objects) for SocketIO emit.
        """
        return {
            "sim_time": sim_now.isoformat(),
            "trucks": [t.as_dict() for t in self.trucks],
            # bins omitted for brevity
        }
