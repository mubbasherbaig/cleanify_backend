"""
Switches between STATIC and DYNAMIC modes:
    STATIC   – returns per-bin constant
    DYNAMIC  – f(ETA, traffic, bin_type, maybe ML later)
"""
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import math
from cleanify.core.models.bin import Bin, WasteType


class ThresholdService:
    def __init__(self, osrm_service=None, traffic_service=None):
        self.osrm_service = osrm_service
        self.traffic_service = traffic_service
        self.mode = "static"  # "static" or "dynamic"
        
        # Static thresholds by waste type
        self.static_thresholds = {
            WasteType.GENERAL: 80.0,
            WasteType.RECYCLABLE: 85.0,
            WasteType.HAZARDOUS: 70.0  # Lower threshold for hazardous waste
        }
        
        # Dynamic threshold parameters
        self.dynamic_config = {
            "base_threshold": 80.0,
            "eta_weight": 0.3,          # How much ETA affects threshold
            "traffic_weight": 0.2,      # How much traffic affects threshold
            "priority_weight": 0.1,     # How much bin priority affects threshold
            "fill_rate_weight": 0.15,   # How much fill rate affects threshold
            "time_weight": 0.1,         # How much time of day affects threshold
            "capacity_weight": 0.15,    # How much bin capacity affects threshold
            
            # Adjustment ranges
            "min_threshold": 50.0,
            "max_threshold": 95.0,
            
            # ETA factors
            "min_eta_minutes": 10,      # Minimum ETA to consider
            "max_eta_minutes": 120,     # Maximum ETA for calculations
            
            # Time of day factors
            "peak_hours": [(7, 9), (17, 19)],  # Rush hours
            "off_peak_bonus": 5.0,      # Lower threshold during off-peak
            
            # Fill rate factors
            "slow_fill_rate": 2.0,      # kg/hour - considered slow
            "fast_fill_rate": 10.0,     # kg/hour - considered fast
        }
    
    def set_mode(self, mode: str) -> None:
        """Switch between static and dynamic threshold modes"""
        if mode not in ["static", "dynamic"]:
            raise ValueError("Mode must be 'static' or 'dynamic'")
        self.mode = mode
    
    def get_mode(self) -> str:
        """Get current threshold mode"""
        return self.mode
    
    def threshold_for(self, bin_obj: Bin, depot_location: tuple = None, 
                     current_time: datetime = None) -> float:
        """Calculate threshold for a specific bin"""
        if self.mode == "static":
            return self._static_threshold(bin_obj)
        else:
            return self._dynamic_threshold(bin_obj, depot_location, current_time)
    
    def _static_threshold(self, bin_obj: Bin) -> float:
        """Return static threshold based on waste type"""
        return self.static_thresholds.get(bin_obj.type, 80.0)
    
    def _dynamic_threshold(self, bin_obj: Bin, depot_location: tuple = None, 
                          current_time: datetime = None) -> float:
        """Calculate dynamic threshold based on multiple factors"""
        if current_time is None:
            current_time = datetime.now()
        
        base_threshold = self.dynamic_config["base_threshold"]
        
        # Start with static threshold as base
        threshold = self.static_thresholds.get(bin_obj.type, base_threshold)
        
        # Factor 1: ETA from depot/nearest truck
        eta_adjustment = self._calculate_eta_adjustment(bin_obj, depot_location)
        threshold += eta_adjustment * self.dynamic_config["eta_weight"]
        
        # Factor 2: Current traffic conditions
        traffic_adjustment = self._calculate_traffic_adjustment()
        threshold += traffic_adjustment * self.dynamic_config["traffic_weight"]
        
        # Factor 3: Bin priority
        priority_adjustment = self._calculate_priority_adjustment(bin_obj)
        threshold += priority_adjustment * self.dynamic_config["priority_weight"]
        
        # Factor 4: Fill rate
        fill_rate_adjustment = self._calculate_fill_rate_adjustment(bin_obj)
        threshold += fill_rate_adjustment * self.dynamic_config["fill_rate_weight"]
        
        # Factor 5: Time of day
        time_adjustment = self._calculate_time_adjustment(current_time)
        threshold += time_adjustment * self.dynamic_config["time_weight"]
        
        # Factor 6: Bin capacity
        capacity_adjustment = self._calculate_capacity_adjustment(bin_obj)
        threshold += capacity_adjustment * self.dynamic_config["capacity_weight"]
        
        # Clamp to valid range
        threshold = max(
            self.dynamic_config["min_threshold"],
            min(self.dynamic_config["max_threshold"], threshold)
        )
        
        return round(threshold, 1)
    
    def _calculate_eta_adjustment(self, bin_obj: Bin, depot_location: tuple = None) -> float:
        """Calculate threshold adjustment based on ETA to bin"""
        if not depot_location or not self.osrm_service:
            return 0.0
        
        try:
            # Get route from depot to bin
            route_info = self.osrm_service.route([depot_location, bin_obj.location])
            eta_seconds = route_info.get('routes', [{}])[0].get('duration', 0)
            eta_minutes = eta_seconds / 60
            
            # Apply traffic multiplier if available
            if self.traffic_service:
                traffic_mult = self.traffic_service.current_multiplier()
                eta_minutes *= traffic_mult
            
            # Normalize ETA to adjustment factor
            min_eta = self.dynamic_config["min_eta_minutes"]
            max_eta = self.dynamic_config["max_eta_minutes"]
            
            if eta_minutes <= min_eta:
                # Very close - can afford to wait longer
                return 10.0
            elif eta_minutes >= max_eta:
                # Very far - collect earlier
                return -15.0
            else:
                # Linear interpolation between close and far
                normalized_eta = (eta_minutes - min_eta) / (max_eta - min_eta)
                return 10.0 - (25.0 * normalized_eta)  # 10 to -15
        
        except Exception:
            # If route calculation fails, return neutral adjustment
            return 0.0
    
    def _calculate_traffic_adjustment(self) -> float:
        """Calculate threshold adjustment based on current traffic"""
        if not self.traffic_service:
            return 0.0
        
        traffic_mult = self.traffic_service.current_multiplier()
        
        # High traffic = collect earlier (lower threshold)
        # Low traffic = can wait longer (higher threshold)
        if traffic_mult <= 1.1:
            return 5.0  # Light traffic - can wait
        elif traffic_mult <= 1.3:
            return 0.0  # Normal traffic - no adjustment
        elif traffic_mult <= 1.6:
            return -5.0  # Heavy traffic - collect earlier
        else:
            return -10.0  # Very heavy traffic - collect much earlier
    
    def _calculate_priority_adjustment(self, bin_obj: Bin) -> float:
        """Calculate threshold adjustment based on bin priority"""
        # Higher priority bins should be collected earlier
        priority_adjustments = {
            1: 5.0,   # Low priority - can wait longer
            2: 0.0,   # Medium priority - no adjustment
            3: -10.0  # High priority - collect earlier
        }
        return priority_adjustments.get(bin_obj.priority, 0.0)
    
    def _calculate_fill_rate_adjustment(self, bin_obj: Bin) -> float:
        """Calculate threshold adjustment based on bin fill rate"""
        slow_rate = self.dynamic_config["slow_fill_rate"]
        fast_rate = self.dynamic_config["fast_fill_rate"]
        
        if bin_obj.fill_rate <= slow_rate:
            # Slow filling - can wait longer
            return 8.0
        elif bin_obj.fill_rate >= fast_rate:
            # Fast filling - collect earlier
            return -12.0
        else:
            # Medium fill rate - linear interpolation
            normalized_rate = (bin_obj.fill_rate - slow_rate) / (fast_rate - slow_rate)
            return 8.0 - (20.0 * normalized_rate)  # 8 to -12
    
    def _calculate_time_adjustment(self, current_time: datetime) -> float:
        """Calculate threshold adjustment based on time of day"""
        current_hour = current_time.hour
        
        # Check if in peak hours
        for start_hour, end_hour in self.dynamic_config["peak_hours"]:
            if start_hour <= current_hour < end_hour:
                # Peak hours - collect earlier to avoid traffic
                return -self.dynamic_config["off_peak_bonus"]
        
        # Off-peak hours - can wait longer
        return self.dynamic_config["off_peak_bonus"]
    
    def _calculate_capacity_adjustment(self, bin_obj: Bin) -> float:
        """Calculate threshold adjustment based on bin capacity"""
        # Larger bins can afford to wait longer before collection
        # Smaller bins should be collected more frequently
        
        if bin_obj.capacity >= 150:
            # Large bin - can wait longer
            return 5.0
        elif bin_obj.capacity <= 50:
            # Small bin - collect earlier
            return -8.0
        else:
            # Medium bin - linear interpolation
            normalized_capacity = (bin_obj.capacity - 50) / (150 - 50)
            return -8.0 + (13.0 * normalized_capacity)  # -8 to 5
    
    def set_static_threshold(self, waste_type: WasteType, threshold: float) -> None:
        """Set static threshold for a waste type"""
        if not (0 <= threshold <= 100):
            raise ValueError("Threshold must be between 0 and 100")
        self.static_thresholds[waste_type] = threshold
    
    def get_static_threshold(self, waste_type: WasteType) -> float:
        """Get static threshold for a waste type"""
        return self.static_thresholds.get(waste_type, 80.0)
    
    def configure_dynamic(self, config: Dict[str, Any]) -> None:
        """Update dynamic threshold configuration"""
        for key, value in config.items():
            if key in self.dynamic_config:
                self.dynamic_config[key] = value
    
    def get_dynamic_config(self) -> Dict[str, Any]:
        """Get current dynamic configuration"""
        return self.dynamic_config.copy()
    
    def analyze_threshold_factors(self, bin_obj: Bin, depot_location: tuple = None,
                                 current_time: datetime = None) -> Dict[str, Any]:
        """Analyze all factors affecting threshold calculation for debugging"""
        if current_time is None:
            current_time = datetime.now()
        
        static_threshold = self._static_threshold(bin_obj)
        
        if self.mode == "static":
            return {
                "mode": "static",
                "final_threshold": static_threshold,
                "base_threshold": static_threshold,
                "factors": {}
            }
        
        # Calculate each factor
        eta_adjustment = self._calculate_eta_adjustment(bin_obj, depot_location)
        traffic_adjustment = self._calculate_traffic_adjustment()
        priority_adjustment = self._calculate_priority_adjustment(bin_obj)
        fill_rate_adjustment = self._calculate_fill_rate_adjustment(bin_obj)
        time_adjustment = self._calculate_time_adjustment(current_time)
        capacity_adjustment = self._calculate_capacity_adjustment(bin_obj)
        
        # Calculate weighted adjustments
        weighted_eta = eta_adjustment * self.dynamic_config["eta_weight"]
        weighted_traffic = traffic_adjustment * self.dynamic_config["traffic_weight"]
        weighted_priority = priority_adjustment * self.dynamic_config["priority_weight"]
        weighted_fill_rate = fill_rate_adjustment * self.dynamic_config["fill_rate_weight"]
        weighted_time = time_adjustment * self.dynamic_config["time_weight"]
        weighted_capacity = capacity_adjustment * self.dynamic_config["capacity_weight"]
        
        total_adjustment = (weighted_eta + weighted_traffic + weighted_priority + 
                          weighted_fill_rate + weighted_time + weighted_capacity)
        
        final_threshold = max(
            self.dynamic_config["min_threshold"],
            min(self.dynamic_config["max_threshold"], static_threshold + total_adjustment)
        )
        
        return {
            "mode": "dynamic",
            "final_threshold": round(final_threshold, 1),
            "base_threshold": static_threshold,
            "total_adjustment": round(total_adjustment, 2),
            "factors": {
                "eta": {
                    "raw_adjustment": round(eta_adjustment, 2),
                    "weighted_adjustment": round(weighted_eta, 2),
                    "weight": self.dynamic_config["eta_weight"]
                },
                "traffic": {
                    "raw_adjustment": round(traffic_adjustment, 2),
                    "weighted_adjustment": round(weighted_traffic, 2),
                    "weight": self.dynamic_config["traffic_weight"],
                    "current_multiplier": (
                        self.traffic_service.current_multiplier() 
                        if self.traffic_service else None
                    )
                },
                "priority": {
                    "raw_adjustment": round(priority_adjustment, 2),
                    "weighted_adjustment": round(weighted_priority, 2),
                    "weight": self.dynamic_config["priority_weight"],
                    "bin_priority": bin_obj.priority
                },
                "fill_rate": {
                    "raw_adjustment": round(fill_rate_adjustment, 2),
                    "weighted_adjustment": round(weighted_fill_rate, 2),
                    "weight": self.dynamic_config["fill_rate_weight"],
                    "bin_fill_rate": bin_obj.fill_rate
                },
                "time_of_day": {
                    "raw_adjustment": round(time_adjustment, 2),
                    "weighted_adjustment": round(weighted_time, 2),
                    "weight": self.dynamic_config["time_weight"],
                    "current_hour": current_time.hour
                },
                "capacity": {
                    "raw_adjustment": round(capacity_adjustment, 2),
                    "weighted_adjustment": round(weighted_capacity, 2),
                    "weight": self.dynamic_config["capacity_weight"],
                    "bin_capacity": bin_obj.capacity
                }
            }
        }
    
    def get_status(self) -> Dict[str, Any]:
        """Get current threshold service status"""
        return {
            "mode": self.mode,
            "static_thresholds": {wt.value: thresh for wt, thresh in self.static_thresholds.items()},
            "dynamic_config": self.dynamic_config.copy(),
            "services": {
                "osrm_available": self.osrm_service is not None,
                "traffic_available": self.traffic_service is not None
            }
        }