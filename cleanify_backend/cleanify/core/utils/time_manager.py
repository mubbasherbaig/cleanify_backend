"""
Keeps track of simulation clock, speed multiplier, pause state.
Does **not** know about traffic or trucks – single responsibility!
"""
import time
from datetime import datetime, timedelta
from typing import Optional


class TimeManager:
    """Manages simulation time, speed, and pause state"""
    
    def __init__(self, start_time: Optional[datetime] = None):
        self.speed = 1
        self.is_paused = False
        self._sim_time = start_time or datetime.now()
        self._real_last = time.perf_counter()
        self._pause_start_time = None
        self._total_paused_time = 0.0
        self._last_delta = 0.0
        
        # Statistics
        self.total_sim_time_elapsed = 0.0  # In simulation seconds
        self.total_real_time_elapsed = 0.0  # In real seconds
        self.speed_changes = 0
        self.pause_count = 0

    # --- Public API -------------------------------------------------------

    def set_speed(self, factor: int) -> None:
        """Set simulation speed multiplier (1-10x)"""
        old_speed = self.speed
        self.speed = max(1, min(10, factor))
        
        if old_speed != self.speed:
            self.speed_changes += 1
            
            # Update timing to prevent jumps when speed changes
            if not self.is_paused:
                self._real_last = time.perf_counter()

    def pause(self) -> None:
        """Pause the simulation time"""
        if not self.is_paused:
            self.is_paused = True
            self._pause_start_time = time.perf_counter()
            self.pause_count += 1

    def resume(self) -> None:
        """Resume the simulation time"""
        if self.is_paused:
            self.is_paused = False
            
            # Track total paused time
            if self._pause_start_time:
                pause_duration = time.perf_counter() - self._pause_start_time
                self._total_paused_time += pause_duration
                self._pause_start_time = None
            
            # Reset real time reference to prevent time jumps
            self._real_last = time.perf_counter()

    def now(self) -> datetime:
        """
        Returns current simulation time, advancing internal state
        based on real wall-clock passed since last call.
        """
        if self.is_paused:
            return self._sim_time

        real_now = time.perf_counter()
        real_delta = real_now - self._real_last
        self._real_last = real_now
        
        # Store last delta for other methods to use
        self._last_delta = real_delta
        
        # Apply speed multiplier and advance simulation time
        sim_delta = timedelta(seconds=real_delta * self.speed)
        self._sim_time += sim_delta
        
        # Update statistics
        self.total_sim_time_elapsed += real_delta * self.speed
        self.total_real_time_elapsed += real_delta
        
        return self._sim_time

    def get_time_delta_seconds(self) -> float:
        """Get time delta from last update in simulation seconds"""
        return self._last_delta * self.speed

    def get_time_delta_minutes(self) -> float:
        """Get time delta from last update in simulation minutes"""
        return self.get_time_delta_seconds() / 60.0

    def get_time_delta_hours(self) -> float:
        """Get time delta from last update in simulation hours"""
        return self.get_time_delta_seconds() / 3600.0

    def set_time(self, new_time: datetime) -> None:
        """Manually set simulation time"""
        self._sim_time = new_time
        self._real_last = time.perf_counter()

    def fast_forward(self, duration: timedelta) -> None:
        """Fast forward simulation time by specified duration"""
        self._sim_time += duration
        # Don't update real time reference - this is an instant jump

    def get_elapsed_real_time(self) -> float:
        """Get total real time elapsed since creation (excluding pauses)"""
        current_time = time.perf_counter()
        total_elapsed = current_time - (self._real_last - self.total_real_time_elapsed)
        
        # Subtract time spent paused
        paused_time = self._total_paused_time
        if self.is_paused and self._pause_start_time:
            paused_time += current_time - self._pause_start_time
        
        return max(0, total_elapsed - paused_time)

    def get_elapsed_sim_time(self) -> float:
        """Get total simulation time elapsed since creation"""
        return self.total_sim_time_elapsed

    def get_sim_time_ratio(self) -> float:
        """Get ratio of simulation time to real time"""
        real_time = self.get_elapsed_real_time()
        if real_time > 0:
            return self.total_sim_time_elapsed / real_time
        return 0.0

    def get_average_speed(self) -> float:
        """Get average speed multiplier over the lifetime"""
        return self.get_sim_time_ratio()

    def reset(self, start_time: Optional[datetime] = None) -> None:
        """Reset time manager to initial state"""
        self._sim_time = start_time or datetime.now()
        self._real_last = time.perf_counter()
        self.is_paused = False
        self._pause_start_time = None
        self._total_paused_time = 0.0
        self._last_delta = 0.0
        
        # Reset statistics
        self.total_sim_time_elapsed = 0.0
        self.total_real_time_elapsed = 0.0
        self.speed_changes = 0
        self.pause_count = 0

    def get_status(self) -> dict:
        """Get current status and statistics"""
        return {
            "current_sim_time": self._sim_time.isoformat(),
            "speed": self.speed,
            "is_paused": self.is_paused,
            "total_sim_time_elapsed": self.total_sim_time_elapsed,
            "total_real_time_elapsed": self.get_elapsed_real_time(),
            "total_paused_time": self._total_paused_time,
            "sim_time_ratio": self.get_sim_time_ratio(),
            "average_speed": self.get_average_speed(),
            "speed_changes": self.speed_changes,
            "pause_count": self.pause_count,
            "last_delta_seconds": self._last_delta,
            "last_delta_sim_seconds": self.get_time_delta_seconds()
        }

    def format_duration(self, seconds: float) -> str:
        """Format duration in seconds to human readable string"""
        if seconds < 60:
            return f"{seconds:.1f}s"
        elif seconds < 3600:
            minutes = seconds / 60
            return f"{minutes:.1f}m"
        elif seconds < 86400:
            hours = seconds / 3600
            return f"{hours:.1f}h"
        else:
            days = seconds / 86400
            return f"{days:.1f}d"

    def get_formatted_status(self) -> dict:
        """Get status with human-readable formatted durations"""
        status = self.get_status()
        
        return {
            **status,
            "formatted": {
                "total_sim_time_elapsed": self.format_duration(status["total_sim_time_elapsed"]),
                "total_real_time_elapsed": self.format_duration(status["total_real_time_elapsed"]),
                "total_paused_time": self.format_duration(status["total_paused_time"]),
                "current_sim_time": self._sim_time.strftime("%Y-%m-%d %H:%M:%S"),
                "speed_display": f"{self.speed}x"
            }
        }

    # --- Time zone and scheduling helpers ---

    def get_sim_hour(self) -> int:
        """Get current simulation hour (0-23)"""
        return self._sim_time.hour

    def get_sim_minute(self) -> int:
        """Get current simulation minute (0-59)"""
        return self._sim_time.minute

    def get_sim_day_of_week(self) -> int:
        """Get current simulation day of week (0=Monday, 6=Sunday)"""
        return self._sim_time.weekday()

    def is_business_hours(self, start_hour: int = 8, end_hour: int = 18) -> bool:
        """Check if current simulation time is within business hours"""
        current_hour = self.get_sim_hour()
        return start_hour <= current_hour < end_hour

    def is_weekend(self) -> bool:
        """Check if current simulation time is weekend"""
        return self.get_sim_day_of_week() >= 5  # Saturday = 5, Sunday = 6

    def time_until_hour(self, target_hour: int) -> timedelta:
        """Calculate time until specified hour (next occurrence)"""
        current_time = self._sim_time
        target_time = current_time.replace(hour=target_hour, minute=0, second=0, microsecond=0)
        
        # If target hour has passed today, move to tomorrow
        if target_time <= current_time:
            target_time += timedelta(days=1)
        
        return target_time - current_time

    def schedule_at_sim_time(self, target_time: datetime) -> timedelta:
        """Calculate time delta to reach target simulation time"""
        if target_time <= self._sim_time:
            return timedelta(0)
        return target_time - self._sim_time

    # --- Performance monitoring ---

    def get_performance_metrics(self) -> dict:
        """Get performance-related metrics"""
        avg_tick_duration = 0.0
        if self.total_real_time_elapsed > 0:
            # Estimate average time per simulation tick
            avg_tick_duration = self.total_real_time_elapsed / max(1, self.total_sim_time_elapsed)
        
        return {
            "average_tick_duration": avg_tick_duration,
            "simulation_efficiency": min(100.0, (self.speed / max(0.1, avg_tick_duration * self.speed)) * 100),
            "time_compression_ratio": self.speed,
            "real_time_factor": 1.0 / max(0.001, avg_tick_duration) if avg_tick_duration > 0 else 0,
            "pause_efficiency": (
                (self.get_elapsed_real_time() / max(0.001, self.get_elapsed_real_time() + self._total_paused_time)) * 100
                if self.get_elapsed_real_time() + self._total_paused_time > 0 else 100
            )
        }