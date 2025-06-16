"""
Holds current traffic multiplier (1.0-2.0).
If auto-mode: updates itself using stochastic function each N sim-minutes.
If manual-mode: just exposes the slider value set via Settings API.
"""
import random
import math
from datetime import datetime, timedelta
from typing import Dict, Any, Optional


class TrafficService:
    def __init__(self, time_manager=None):
        self.mode = "auto"
        self.manual_mult = 1.0
        self._last_auto_update = 0
        self._last_update_time = datetime.now()
        self._current_auto_multiplier = 1.0
        self._time_manager = time_manager
        
        # Traffic pattern configuration
        self.rush_hour_morning = (7, 9)  # 7-9 AM
        self.rush_hour_evening = (17, 19)  # 5-7 PM
        self.base_multiplier = 1.0
        self.max_multiplier = 2.0
        self.min_multiplier = 1.0
        self.update_interval_minutes = 5  # Update every 5 sim minutes
        
        # Noise parameters
        self.noise_amplitude = 0.1
        self.traffic_events = []  # Special events affecting traffic
    
    def set_manual(self, multiplier: float) -> None:
        """Set manual traffic mode with specific multiplier"""
        self.mode = "manual"
        self.manual_mult = max(self.min_multiplier, min(self.max_multiplier, float(multiplier)))
    
    def set_auto(self) -> None:
        """Switch to automatic traffic mode"""
        self.mode = "auto"
        self._last_auto_update = 0  # Force immediate update
    
    def current_multiplier(self) -> float:
        """Get current traffic multiplier"""
        if self.mode == "manual":
            return self.manual_mult
        
        # Auto mode - update if needed
        self._update_auto_multiplier()
        return self._current_auto_multiplier
    
    def _update_auto_multiplier(self) -> None:
        """Update automatic traffic multiplier based on time and patterns"""
        current_time = self._get_current_sim_time()
        
        # Check if enough time has passed for update
        time_since_update = (current_time - self._last_update_time).total_seconds() / 60
        if time_since_update < self.update_interval_minutes:
            return
        
        hour = current_time.hour
        minute = current_time.minute
        day_of_week = current_time.weekday()  # 0=Monday, 6=Sunday
        
        # Calculate base multiplier based on time patterns
        base_mult = self._calculate_time_based_multiplier(hour, minute, day_of_week)
        
        # Add random noise
        noise = random.uniform(-self.noise_amplitude, self.noise_amplitude)
        
        # Apply any special traffic events
        event_mult = self._calculate_event_multiplier(current_time)
        
        # Combine all factors
        new_multiplier = base_mult + noise + event_mult
        
        # Clamp to valid range
        self._current_auto_multiplier = max(
            self.min_multiplier, 
            min(self.max_multiplier, new_multiplier)
        )
        
        self._last_update_time = current_time
    
    def _calculate_time_based_multiplier(self, hour: int, minute: int, day_of_week: int) -> float:
        """Calculate traffic multiplier based on time patterns"""
        # Weekend factor (lower traffic)
        weekend_factor = 0.8 if day_of_week >= 5 else 1.0
        
        # Rush hour calculations
        current_time_decimal = hour + minute / 60.0
        
        # Morning rush hour (7-9 AM)
        morning_start, morning_end = self.rush_hour_morning
        if morning_start <= current_time_decimal <= morning_end:
            rush_intensity = self._calculate_rush_intensity(
                current_time_decimal, morning_start, morning_end
            )
            base_mult = self.base_multiplier + (0.6 * rush_intensity)
        
            # Evening rush hour (5-7 PM)
            evening_start, evening_end = self.rush_hour_evening
        elif evening_start <= current_time_decimal <= evening_end:
            rush_intensity = self._calculate_rush_intensity(
                current_time_decimal, evening_start, evening_end
            )
            base_mult = self.base_multiplier + (0.8 * rush_intensity)
        
        # Late night (11 PM - 6 AM) - lower traffic
        elif current_time_decimal >= 23 or current_time_decimal <= 6:
            base_mult = self.base_multiplier * 0.7
        
        # Regular hours
        else:
            # Gradual increase from 6 AM to 11 PM
            if 6 <= current_time_decimal <= 11:
                # Morning buildup
                factor = (current_time_decimal - 6) / 5  # 0 to 1 over 5 hours
                base_mult = self.base_multiplier * (0.7 + 0.3 * factor)
            elif 11 <= current_time_decimal <= 17:
                # Midday - moderate traffic
                base_mult = self.base_multiplier * 1.1
            elif 19 <= current_time_decimal <= 23:
                # Evening decline
                factor = (23 - current_time_decimal) / 4  # 1 to 0 over 4 hours
                base_mult = self.base_multiplier * (0.8 + 0.3 * factor)
            else:
                base_mult = self.base_multiplier
        
        return base_mult * weekend_factor
    
    def _calculate_rush_intensity(self, current_time: float, start_time: float, end_time: float) -> float:
        """Calculate rush hour intensity (0-1) based on position within rush period"""
        duration = end_time - start_time
        position = current_time - start_time
        
        # Bell curve with peak in middle
        normalized_pos = (position / duration) * 2 - 1  # -1 to 1
        intensity = math.exp(-2 * normalized_pos**2)  # Gaussian-like curve
        
        return intensity
    
    def _calculate_event_multiplier(self, current_time: datetime) -> float:
        """Calculate additional multiplier from special traffic events"""
        total_event_mult = 0.0
        
        # Remove expired events
        self.traffic_events = [
            event for event in self.traffic_events 
            if current_time < event['end_time']
        ]
        
        # Apply active events
        for event in self.traffic_events:
            if event['start_time'] <= current_time <= event['end_time']:
                total_event_mult += event['multiplier_delta']
        
        return total_event_mult
    
    def add_traffic_event(self, start_time: datetime, end_time: datetime, 
                         multiplier_delta: float, description: str = "") -> None:
        """Add a special traffic event (accident, construction, etc.)"""
        event = {
            'start_time': start_time,
            'end_time': end_time,
            'multiplier_delta': multiplier_delta,
            'description': description,
            'id': len(self.traffic_events)
        }
        self.traffic_events.append(event)
    
    def remove_traffic_event(self, event_id: int) -> bool:
        """Remove a traffic event by ID"""
        initial_count = len(self.traffic_events)
        self.traffic_events = [
            event for event in self.traffic_events 
            if event.get('id') != event_id
        ]
        return len(self.traffic_events) < initial_count
    
    def clear_traffic_events(self) -> None:
        """Clear all traffic events"""
        self.traffic_events = []
    
    def get_traffic_forecast(self, hours_ahead: int = 24) -> list:
        """Get traffic multiplier forecast for next N hours"""
        forecast = []
        current_time = self._get_current_sim_time()
        
        for hour_offset in range(hours_ahead):
            future_time = current_time + timedelta(hours=hour_offset)
            hour = future_time.hour
            minute = future_time.minute
            day_of_week = future_time.weekday()
            
            base_mult = self._calculate_time_based_multiplier(hour, minute, day_of_week)
            event_mult = self._calculate_event_multiplier(future_time)
            
            total_mult = max(
                self.min_multiplier,
                min(self.max_multiplier, base_mult + event_mult)
            )
            
            forecast.append({
                'time': future_time.isoformat(),
                'hour': hour,
                'multiplier': round(total_mult, 2),
                'base_multiplier': round(base_mult, 2),
                'event_multiplier': round(event_mult, 2)
            })
        
        return forecast
    
    def _get_current_sim_time(self) -> datetime:
        """Get current simulation time"""
        if self._time_manager:
            return self._time_manager.now()
        return datetime.now()
    
    def get_status(self) -> Dict[str, Any]:
        """Get current traffic service status"""
        current_time = self._get_current_sim_time()
        
        return {
            "mode": self.mode,
            "current_multiplier": round(self.current_multiplier(), 2),
            "manual_multiplier": self.manual_mult,
            "auto_multiplier": round(self._current_auto_multiplier, 2),
            "current_time": current_time.isoformat(),
            "current_hour": current_time.hour,
            "active_events": len([
                e for e in self.traffic_events 
                if e['start_time'] <= current_time <= e['end_time']
            ]),
            "total_events": len(self.traffic_events),
            "update_interval_minutes": self.update_interval_minutes,
            "last_update": self._last_update_time.isoformat()
        }
    
    def configure_patterns(self, config: Dict[str, Any]) -> None:
        """Configure traffic patterns"""
        if 'rush_hour_morning' in config:
            self.rush_hour_morning = tuple(config['rush_hour_morning'])
        
        if 'rush_hour_evening' in config:
            self.rush_hour_evening = tuple(config['rush_hour_evening'])
        
        if 'base_multiplier' in config:
            self.base_multiplier = config['base_multiplier']
        
        if 'max_multiplier' in config:
            self.max_multiplier = config['max_multiplier']
        
        if 'min_multiplier' in config:
            self.min_multiplier = config['min_multiplier']
        
        if 'noise_amplitude' in config:
            self.noise_amplitude = config['noise_amplitude']
        
        if 'update_interval_minutes' in config:
            self.update_interval_minutes = config['update_interval_minutes']