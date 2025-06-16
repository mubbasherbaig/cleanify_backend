"""
Threshold mode, working hours, global toggles, traffic settings.
Keep route functions thin - delegate to services.
"""
from flask import Blueprint, request, jsonify, current_app
from werkzeug.local import LocalProxy
from typing import Dict, Any, List
import logging
from datetime import datetime, timedelta
simulation_service = LocalProxy(lambda: current_app.simulation_service)
from cleanify.core.models.bin import WasteType
from cleanify.tasks.scheduler import schedule_collection

bp = Blueprint("settings", __name__)
logger = logging.getLogger(__name__)


@bp.route("/", methods=["GET"])
def get_all_settings():
    """Get all current settings"""
    try:
        settings = {
            "simulation": {
                "speed": simulation_service.time_manager.speed,
                "is_paused": simulation_service.time_manager.is_paused,
                "current_time": simulation_service.time_manager.now().isoformat(),
                "config": simulation_service.config.copy()
            },
            "traffic": simulation_service.traffic_service.get_status(),
            "threshold": simulation_service.threshold_service.get_status(),
            "optimization": simulation_service.optimization_svc.config.copy(),
            "scheduler": {
                "collections_per_day": getattr(simulation_service, '_collections_per_day', 2),
                "working_hours": getattr(simulation_service, '_working_hours', (8, 18))
            }
        }
        
        return jsonify({
            "success": True,
            "settings": settings
        })
        
    except Exception as e:
        logger.error(f"Failed to get settings: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/simulation", methods=["GET"])
def get_simulation_settings():
    """Get simulation-specific settings"""
    try:
        settings = {
            "speed": simulation_service.time_manager.speed,
            "is_paused": simulation_service.time_manager.is_paused,
            "current_time": simulation_service.time_manager.now().isoformat(),
            "time_manager_status": simulation_service.time_manager.get_formatted_status(),
            "config": simulation_service.config.copy(),
            "statistics": simulation_service.get_statistics()
        }
        
        return jsonify({
            "success": True,
            "simulation_settings": settings
        })
        
    except Exception as e:
        logger.error(f"Failed to get simulation settings: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/simulation", methods=["POST"])
def update_simulation_settings():
    """Update simulation settings"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No settings data provided"}), 400
        
        updated_settings = []
        
        # Update simulation config
        if "config" in data:
            simulation_service.configure(data["config"])
            updated_settings.append("simulation_config")
        
        # Update individual settings
        if "auto_optimization" in data:
            simulation_service.config["auto_optimization"] = bool(data["auto_optimization"])
            updated_settings.append("auto_optimization")
        
        if "auto_bin_filling" in data:
            simulation_service.config["auto_bin_filling"] = bool(data["auto_bin_filling"])
            updated_settings.append("auto_bin_filling")
        
        if "emit_frequency" in data:
            emit_freq = int(data["emit_frequency"])
            if emit_freq > 0:
                simulation_service.config["emit_frequency"] = emit_freq
                updated_settings.append("emit_frequency")
        
        if "truck_breakdown_probability" in data:
            prob = float(data["truck_breakdown_probability"])
            if 0 <= prob <= 1:
                simulation_service.config["truck_breakdown_probability"] = prob
                updated_settings.append("truck_breakdown_probability")
        
        return jsonify({
            "success": True,
            "message": "Simulation settings updated",
            "updated_settings": updated_settings,
            "current_config": simulation_service.config.copy()
        })
        
    except Exception as e:
        logger.error(f"Failed to update simulation settings: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/traffic", methods=["GET"])
def get_traffic_settings():
    """Get traffic service settings"""
    try:
        settings = simulation_service.traffic_service.get_status()
        
        # Add forecast
        settings["forecast"] = simulation_service.traffic_service.get_traffic_forecast(24)
        
        return jsonify({
            "success": True,
            "traffic_settings": settings
        })
        
    except Exception as e:
        logger.error(f"Failed to get traffic settings: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/traffic", methods=["POST"])
def update_traffic_settings():
    """Update traffic settings"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No traffic settings provided"}), 400
        
        updated_settings = []
        
        # Switch traffic mode
        if "mode" in data:
            mode = data["mode"]
            if mode == "auto":
                simulation_service.traffic_service.set_auto()
                updated_settings.append("mode_auto")
            elif mode == "manual":
                multiplier = data.get("manual_multiplier", 1.0)
                if not (1.0 <= multiplier <= 2.0):
                    return jsonify({
                        "success": False, 
                        "error": "Manual multiplier must be between 1.0 and 2.0"
                    }), 400
                simulation_service.traffic_service.set_manual(multiplier)
                updated_settings.append("mode_manual")
            else:
                return jsonify({"success": False, "error": "Invalid mode. Use 'auto' or 'manual'"}), 400
        
        # Update traffic patterns configuration
        if "patterns" in data:
            simulation_service.traffic_service.configure_patterns(data["patterns"])
            updated_settings.append("patterns")
        
        return jsonify({
            "success": True,
            "message": "Traffic settings updated",
            "updated_settings": updated_settings,
            "current_status": simulation_service.traffic_service.get_status()
        })
        
    except Exception as e:
        logger.error(f"Failed to update traffic settings: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/traffic/events", methods=["POST"])
def add_traffic_event():
    """Add a traffic event"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No event data provided"}), 400
        
        required_fields = ["start_time", "end_time", "multiplier_delta"]
        for field in required_fields:
            if field not in data:
                return jsonify({"success": False, "error": f"Missing field: {field}"}), 400
        
        # Parse times
        start_time = datetime.fromisoformat(data["start_time"].replace('Z', '+00:00'))
        end_time = datetime.fromisoformat(data["end_time"].replace('Z', '+00:00'))
        
        if end_time <= start_time:
            return jsonify({"success": False, "error": "End time must be after start time"}), 400
        
        multiplier_delta = float(data["multiplier_delta"])
        description = data.get("description", "")
        
        simulation_service.traffic_service.add_traffic_event(
            start_time, end_time, multiplier_delta, description
        )
        
        return jsonify({
            "success": True,
            "message": "Traffic event added",
            "event": {
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "multiplier_delta": multiplier_delta,
                "description": description
            }
        })
        
    except Exception as e:
        logger.error(f"Failed to add traffic event: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/traffic/events", methods=["DELETE"])
def clear_traffic_events():
    """Clear all traffic events"""
    try:
        simulation_service.traffic_service.clear_traffic_events()
        
        return jsonify({
            "success": True,
            "message": "All traffic events cleared"
        })
        
    except Exception as e:
        logger.error(f"Failed to clear traffic events: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/threshold", methods=["GET"])
def get_threshold_settings():
    """Get threshold service settings"""
    try:
        settings = simulation_service.threshold_service.get_status()
        
        return jsonify({
            "success": True,
            "threshold_settings": settings
        })
        
    except Exception as e:
        logger.error(f"Failed to get threshold settings: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/threshold", methods=["POST"])
def update_threshold_settings():
    """Update threshold settings"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No threshold settings provided"}), 400
        
        updated_settings = []
        
        # Switch threshold mode
        if "mode" in data:
            mode = data["mode"]
            if mode not in ["static", "dynamic"]:
                return jsonify({"success": False, "error": "Invalid mode. Use 'static' or 'dynamic'"}), 400
            
            simulation_service.threshold_service.set_mode(mode)
            updated_settings.append(f"mode_{mode}")
        
        # Update static thresholds
        if "static_thresholds" in data:
            static_thresholds = data["static_thresholds"]
            for waste_type_str, threshold in static_thresholds.items():
                try:
                    waste_type = WasteType(waste_type_str)
                    if not (0 <= threshold <= 100):
                        return jsonify({
                            "success": False, 
                            "error": f"Threshold for {waste_type_str} must be between 0 and 100"
                        }), 400
                    
                    simulation_service.threshold_service.set_static_threshold(waste_type, threshold)
                    updated_settings.append(f"static_threshold_{waste_type_str}")
                except ValueError:
                    return jsonify({
                        "success": False, 
                        "error": f"Invalid waste type: {waste_type_str}"
                    }), 400
        
        # Update dynamic configuration
        if "dynamic_config" in data:
            simulation_service.threshold_service.configure_dynamic(data["dynamic_config"])
            updated_settings.append("dynamic_config")
        
        return jsonify({
            "success": True,
            "message": "Threshold settings updated",
            "updated_settings": updated_settings,
            "current_status": simulation_service.threshold_service.get_status()
        })
        
    except Exception as e:
        logger.error(f"Failed to update threshold settings: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/optimization", methods=["GET"])
def get_optimization_settings():
    """Get optimization service settings"""
    try:
        settings = {
            "config": simulation_service.optimization_svc.config.copy(),
            "statistics": simulation_service.optimization_svc.get_statistics()
        }
        
        return jsonify({
            "success": True,
            "optimization_settings": settings
        })
        
    except Exception as e:
        logger.error(f"Failed to get optimization settings: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/optimization", methods=["POST"])
def update_optimization_settings():
    """Update optimization settings"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No optimization settings provided"}), 400
        
        # Validate and apply configuration
        simulation_service.optimization_svc.configure(data)
        
        return jsonify({
            "success": True,
            "message": "Optimization settings updated",
            "current_config": simulation_service.optimization_svc.config.copy()
        })
        
    except Exception as e:
        logger.error(f"Failed to update optimization settings: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/scheduler", methods=["GET"])
def get_scheduler_settings():
    """Get collection scheduler settings"""
    try:
        settings = {
            "collections_per_day": getattr(simulation_service, '_collections_per_day', 2),
            "working_hours": getattr(simulation_service, '_working_hours', (8, 18)),
            "scheduler_active": True  # Assume active if no errors
        }
        
        return jsonify({
            "success": True,
            "scheduler_settings": settings
        })
        
    except Exception as e:
        logger.error(f"Failed to get scheduler settings: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/scheduler", methods=["POST"])
def update_scheduler_settings():
    """Update collection scheduler settings"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No scheduler settings provided"}), 400
        
        updated_settings = []
        
        # Update collections per day
        if "collections_per_day" in data:
            collections_per_day = int(data["collections_per_day"])
            if not (1 <= collections_per_day <= 10):
                return jsonify({
                    "success": False, 
                    "error": "Collections per day must be between 1 and 10"
                }), 400
            
            simulation_service._collections_per_day = collections_per_day
            updated_settings.append("collections_per_day")
        
        # Update working hours
        if "working_hours" in data:
            working_hours = data["working_hours"]
            if not isinstance(working_hours, list) or len(working_hours) != 2:
                return jsonify({
                    "success": False, 
                    "error": "Working hours must be [start_hour, end_hour]"
                }), 400
            
            start_hour, end_hour = working_hours
            if not (0 <= start_hour <= 23 and 1 <= end_hour <= 24):
                return jsonify({
                    "success": False, 
                    "error": "Invalid working hours"
                }), 400
            
            simulation_service._working_hours = tuple(working_hours)
            updated_settings.append("working_hours")
        
        # Apply scheduler changes
        if updated_settings:
            collections_per_day = getattr(simulation_service, '_collections_per_day', 2)
            working_hours = getattr(simulation_service, '_working_hours', (8, 18))
            
            try:
                schedule_collection(collections_per_day, working_hours)
                updated_settings.append("scheduler_updated")
            except Exception as e:
                logger.warning(f"Failed to update scheduler: {e}")
        
        return jsonify({
            "success": True,
            "message": "Scheduler settings updated",
            "updated_settings": updated_settings,
            "current_settings": {
                "collections_per_day": getattr(simulation_service, '_collections_per_day', 2),
                "working_hours": getattr(simulation_service, '_working_hours', (8, 18))
            }
        })
        
    except Exception as e:
        logger.error(f"Failed to update scheduler settings: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/working_hours", methods=["POST"])
def set_working_hours():
    """Set collection working hours"""
    try:
        data = request.get_json()
        
        if not data or "start_hour" not in data or "end_hour" not in data:
            return jsonify({
                "success": False, 
                "error": "start_hour and end_hour required"
            }), 400
        
        start_hour = int(data["start_hour"])
        end_hour = int(data["end_hour"])
        
        if not (0 <= start_hour <= 23 and 1 <= end_hour <= 24):
            return jsonify({
                "success": False, 
                "error": "start_hour: 0-23, end_hour: 1-24"
            }), 400
        
        if start_hour >= end_hour:
            return jsonify({
                "success": False, 
                "error": "end_hour must be greater than start_hour"
            }), 400
        
        working_hours = (start_hour, end_hour)
        simulation_service._working_hours = working_hours
        
        # Update scheduler
        collections_per_day = getattr(simulation_service, '_collections_per_day', 2)
        schedule_collection(collections_per_day, working_hours)
        
        return jsonify({
            "success": True,
            "message": f"Working hours set to {start_hour}:00 - {end_hour}:00",
            "working_hours": working_hours
        })
        
    except Exception as e:
        logger.error(f"Failed to set working hours: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/collections_per_day", methods=["POST"])
def set_collections_per_day():
    """Set number of collections per day"""
    try:
        data = request.get_json()
        
        if not data or "collections_per_day" not in data:
            return jsonify({
                "success": False, 
                "error": "collections_per_day required"
            }), 400
        
        collections_per_day = int(data["collections_per_day"])
        
        if not (1 <= collections_per_day <= 10):
            return jsonify({
                "success": False, 
                "error": "collections_per_day must be between 1 and 10"
            }), 400
        
        simulation_service._collections_per_day = collections_per_day
        
        # Update scheduler
        working_hours = getattr(simulation_service, '_working_hours', (8, 18))
        schedule_collection(collections_per_day, working_hours)
        
        return jsonify({
            "success": True,
            "message": f"Collections per day set to {collections_per_day}",
            "collections_per_day": collections_per_day
        })
        
    except Exception as e:
        logger.error(f"Failed to set collections per day: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/reset", methods=["POST"])
def reset_settings():
    """Reset all settings to defaults"""
    try:
        data = request.get_json() or {}
        reset_categories = data.get("categories", ["simulation", "traffic", "threshold", "optimization"])
        
        reset_results = []
        
        if "simulation" in reset_categories:
            # Reset simulation settings
            simulation_service.configure({
                "auto_optimization": True,
                "auto_bin_filling": True,
                "truck_breakdown_probability": 0.001,
                "bin_overflow_enabled": True,
                "depot_processing_enabled": True,
                "emit_frequency": 1,
                "max_trucks_per_optimization": 10
            })
            reset_results.append("simulation")
        
        if "traffic" in reset_categories:
            # Reset traffic to auto mode
            simulation_service.traffic_service.set_auto()
            simulation_service.traffic_service.clear_traffic_events()
            reset_results.append("traffic")
        
        if "threshold" in reset_categories:
            # Reset threshold mode to static
            simulation_service.threshold_service.set_mode("static")
            
            # Reset static thresholds to defaults
            for waste_type in WasteType:
                default_thresholds = {
                    WasteType.GENERAL: 80.0,
                    WasteType.RECYCLABLE: 85.0,
                    WasteType.HAZARDOUS: 70.0
                }
                simulation_service.threshold_service.set_static_threshold(
                    waste_type, default_thresholds[waste_type]
                )
            reset_results.append("threshold")
        
        if "optimization" in reset_categories:
            # Reset optimization settings
            default_optimization_config = {
                "vrp_time_limit_seconds": 30,
                "knapsack_time_limit_seconds": 5,
                "max_route_distance_km": 100,
                "max_route_duration_minutes": 240,
                "depot_return_required": True,
                "vehicle_capacity_buffer": 0.05,
                "radar_check_interval_minutes": 2,
                "urgency_threshold": 85.0,
                "optimization_algorithm": "auto"
            }
            simulation_service.optimization_svc.configure(default_optimization_config)
            reset_results.append("optimization")
        
        if "scheduler" in reset_categories:
            # Reset scheduler settings
            simulation_service._collections_per_day = 2
            simulation_service._working_hours = (8, 18)
            schedule_collection(2, (8, 18))
            reset_results.append("scheduler")
        
        return jsonify({
            "success": True,
            "message": f"Settings reset for categories: {reset_results}",
            "reset_categories": reset_results
        })
        
    except Exception as e:
        logger.error(f"Failed to reset settings: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/export", methods=["GET"])
def export_settings():
    """Export all current settings as JSON"""
    try:
        settings_export = {
            "export_timestamp": datetime.now().isoformat(),
            "simulation": {
                "config": simulation_service.config.copy(),
                "collections_per_day": getattr(simulation_service, '_collections_per_day', 2),
                "working_hours": getattr(simulation_service, '_working_hours', (8, 18))
            },
            "traffic": {
                "mode": simulation_service.traffic_service.mode,
                "manual_multiplier": simulation_service.traffic_service.manual_mult,
                "patterns": simulation_service.traffic_service.dynamic_config.copy()
            },
            "threshold": {
                "mode": simulation_service.threshold_service.mode,
                "static_thresholds": {
                    wt.value: simulation_service.threshold_service.get_static_threshold(wt)
                    for wt in WasteType
                },
                "dynamic_config": simulation_service.threshold_service.get_dynamic_config()
            },
            "optimization": simulation_service.optimization_svc.config.copy()
        }
        
        return jsonify({
            "success": True,
            "settings_export": settings_export
        })
        
    except Exception as e:
        logger.error(f"Failed to export settings: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/import", methods=["POST"])
def import_settings():
    """Import settings from JSON"""
    try:
        data = request.get_json()
        
        if not data or "settings_export" not in data:
            return jsonify({
                "success": False, 
                "error": "No settings export data provided"
            }), 400
        
        settings_data = data["settings_export"]
        imported_categories = []
        
        # Import simulation settings
        if "simulation" in settings_data:
            sim_data = settings_data["simulation"]
            
            if "config" in sim_data:
                simulation_service.configure(sim_data["config"])
                imported_categories.append("simulation_config")
            
            if "collections_per_day" in sim_data:
                simulation_service._collections_per_day = sim_data["collections_per_day"]
                imported_categories.append("collections_per_day")
            
            if "working_hours" in sim_data:
                simulation_service._working_hours = tuple(sim_data["working_hours"])
                imported_categories.append("working_hours")
        
        # Import traffic settings
        if "traffic" in settings_data:
            traffic_data = settings_data["traffic"]
            
            if traffic_data.get("mode") == "manual":
                simulation_service.traffic_service.set_manual(
                    traffic_data.get("manual_multiplier", 1.0)
                )
            else:
                simulation_service.traffic_service.set_auto()
            
            if "patterns" in traffic_data:
                simulation_service.traffic_service.configure_patterns(traffic_data["patterns"])
            
            imported_categories.append("traffic")
        
        # Import threshold settings
        if "threshold" in settings_data:
            threshold_data = settings_data["threshold"]
            
            if "mode" in threshold_data:
                simulation_service.threshold_service.set_mode(threshold_data["mode"])
            
            if "static_thresholds" in threshold_data:
                for waste_type_str, threshold in threshold_data["static_thresholds"].items():
                    try:
                        waste_type = WasteType(waste_type_str)
                        simulation_service.threshold_service.set_static_threshold(waste_type, threshold)
                    except ValueError:
                        logger.warning(f"Invalid waste type in import: {waste_type_str}")
            
            if "dynamic_config" in threshold_data:
                simulation_service.threshold_service.configure_dynamic(threshold_data["dynamic_config"])
            
            imported_categories.append("threshold")
        
        # Import optimization settings
        if "optimization" in settings_data:
            simulation_service.optimization_svc.configure(settings_data["optimization"])
            imported_categories.append("optimization")
        
        return jsonify({
            "success": True,
            "message": "Settings imported successfully",
            "imported_categories": imported_categories
        })
        
    except Exception as e:
        logger.error(f"Failed to import settings: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/validate", methods=["POST"])
def validate_settings():
    """Validate settings configuration"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No settings data provided"}), 400
        
        validation_results = []
        
        # Validate simulation settings
        if "simulation" in data:
            sim_data = data["simulation"]
            
            if "truck_breakdown_probability" in sim_data:
                prob = sim_data["truck_breakdown_probability"]
                if not (0 <= prob <= 1):
                    validation_results.append({
                        "category": "simulation",
                        "field": "truck_breakdown_probability",
                        "error": "Must be between 0 and 1"
                    })
        
        # Validate traffic settings
        if "traffic" in data:
            traffic_data = data["traffic"]
            
            if "manual_multiplier" in traffic_data:
                mult = traffic_data["manual_multiplier"]
                if not (1.0 <= mult <= 2.0):
                    validation_results.append({
                        "category": "traffic",
                        "field": "manual_multiplier",
                        "error": "Must be between 1.0 and 2.0"
                    })
        
        # Validate threshold settings
        if "threshold" in data:
            threshold_data = data["threshold"]
            
            if "static_thresholds" in threshold_data:
                for waste_type, threshold in threshold_data["static_thresholds"].items():
                    if not (0 <= threshold <= 100):
                        validation_results.append({
                            "category": "threshold",
                            "field": f"static_threshold_{waste_type}",
                            "error": "Must be between 0 and 100"
                        })
        
        # Validate scheduler settings
        if "scheduler" in data:
            scheduler_data = data["scheduler"]
            
            if "collections_per_day" in scheduler_data:
                cpd = scheduler_data["collections_per_day"]
                if not (1 <= cpd <= 10):
                    validation_results.append({
                        "category": "scheduler",
                        "field": "collections_per_day",
                        "error": "Must be between 1 and 10"
                    })
            
            if "working_hours" in scheduler_data:
                wh = scheduler_data["working_hours"]
                if not isinstance(wh, list) or len(wh) != 2:
                    validation_results.append({
                        "category": "scheduler",
                        "field": "working_hours",
                        "error": "Must be [start_hour, end_hour]"
                    })
                elif not (0 <= wh[0] <= 23 and 1 <= wh[1] <= 24 and wh[0] < wh[1]):
                    validation_results.append({
                        "category": "scheduler",
                        "field": "working_hours",
                        "error": "Invalid hour range"
                    })
        
        is_valid = len(validation_results) == 0
        
        return jsonify({
            "success": True,
            "is_valid": is_valid,
            "validation_results": validation_results,
            "message": "Settings are valid" if is_valid else f"Found {len(validation_results)} validation errors"
        })
        
    except Exception as e:
        logger.error(f"Failed to validate settings: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/profiles", methods=["GET"])
def get_settings_profiles():
    """Get predefined settings profiles"""
    try:
        profiles = {
            "default": {
                "name": "Default Configuration",
                "description": "Standard settings for normal operations",
                "settings": {
                    "simulation": {
                        "auto_optimization": True,
                        "auto_bin_filling": True,
                        "truck_breakdown_probability": 0.001,
                        "bin_overflow_enabled": True,
                        "depot_processing_enabled": True,
                        "emit_frequency": 1,
                        "max_trucks_per_optimization": 10
                    },
                    "traffic": {
                        "mode": "auto"
                    },
                    "threshold": {
                        "mode": "static",
                        "static_thresholds": {
                            "general": 80.0,
                            "recyclable": 85.0,
                            "hazardous": 70.0
                        }
                    },
                    "optimization": {
                        "vrp_time_limit_seconds": 30,
                        "knapsack_time_limit_seconds": 5,
                        "max_route_distance_km": 100,
                        "max_route_duration_minutes": 240,
                        "depot_return_required": True,
                        "vehicle_capacity_buffer": 0.05,
                        "radar_check_interval_minutes": 2,
                        "urgency_threshold": 85.0,
                        "optimization_algorithm": "auto"
                    },
                    "scheduler": {
                        "collections_per_day": 2,
                        "working_hours": [8, 18]
                    }
                }
            },
            "efficient": {
                "name": "High Efficiency",
                "description": "Optimized for maximum efficiency and minimal waste",
                "settings": {
                    "simulation": {
                        "auto_optimization": True,
                        "auto_bin_filling": True,
                        "truck_breakdown_probability": 0.0005,
                        "bin_overflow_enabled": True,
                        "depot_processing_enabled": True,
                        "emit_frequency": 2,
                        "max_trucks_per_optimization": 15
                    },
                    "traffic": {
                        "mode": "auto"
                    },
                    "threshold": {
                        "mode": "dynamic",
                        "static_thresholds": {
                            "general": 85.0,
                            "recyclable": 90.0,
                            "hazardous": 65.0
                        },
                        "dynamic_config": {
                            "base_threshold": 85.0,
                            "eta_weight": 0.4,
                            "traffic_weight": 0.3,
                            "priority_weight": 0.2,
                            "fill_rate_weight": 0.2,
                            "time_weight": 0.15,
                            "capacity_weight": 0.2
                        }
                    },
                    "optimization": {
                        "vrp_time_limit_seconds": 45,
                        "knapsack_time_limit_seconds": 8,
                        "max_route_distance_km": 120,
                        "max_route_duration_minutes": 300,
                        "depot_return_required": True,
                        "vehicle_capacity_buffer": 0.02,
                        "radar_check_interval_minutes": 1,
                        "urgency_threshold": 90.0,
                        "optimization_algorithm": "guided_local_search"
                    },
                    "scheduler": {
                        "collections_per_day": 3,
                        "working_hours": [6, 20]
                    }
                }
            },
            "conservative": {
                "name": "Conservative Operations",
                "description": "Lower thresholds for frequent collections",
                "settings": {
                    "simulation": {
                        "auto_optimization": True,
                        "auto_bin_filling": True,
                        "truck_breakdown_probability": 0.002,
                        "bin_overflow_enabled": True,
                        "depot_processing_enabled": True,
                        "emit_frequency": 1,
                        "max_trucks_per_optimization": 8
                    },
                    "traffic": {
                        "mode": "manual",
                        "manual_multiplier": 1.2
                    },
                    "threshold": {
                        "mode": "static",
                        "static_thresholds": {
                            "general": 70.0,
                            "recyclable": 75.0,
                            "hazardous": 60.0
                        }
                    },
                    "optimization": {
                        "vrp_time_limit_seconds": 25,
                        "knapsack_time_limit_seconds": 4,
                        "max_route_distance_km": 80,
                        "max_route_duration_minutes": 200,
                        "depot_return_required": True,
                        "vehicle_capacity_buffer": 0.1,
                        "radar_check_interval_minutes": 3,
                        "urgency_threshold": 75.0,
                        "optimization_algorithm": "auto"
                    },
                    "scheduler": {
                        "collections_per_day": 4,
                        "working_hours": [7, 19]
                    }
                }
            },
            "testing": {
                "name": "Testing & Development",
                "description": "Settings optimized for testing and development",
                "settings": {
                    "simulation": {
                        "auto_optimization": False,
                        "auto_bin_filling": True,
                        "truck_breakdown_probability": 0.01,
                        "bin_overflow_enabled": False,
                        "depot_processing_enabled": True,
                        "emit_frequency": 1,
                        "max_trucks_per_optimization": 5
                    },
                    "traffic": {
                        "mode": "manual",
                        "manual_multiplier": 1.0
                    },
                    "threshold": {
                        "mode": "static",
                        "static_thresholds": {
                            "general": 50.0,
                            "recyclable": 50.0,
                            "hazardous": 50.0
                        }
                    },
                    "optimization": {
                        "vrp_time_limit_seconds": 10,
                        "knapsack_time_limit_seconds": 2,
                        "max_route_distance_km": 50,
                        "max_route_duration_minutes": 120,
                        "depot_return_required": False,
                        "vehicle_capacity_buffer": 0.2,
                        "radar_check_interval_minutes": 5,
                        "urgency_threshold": 60.0,
                        "optimization_algorithm": "greedy"
                    },
                    "scheduler": {
                        "collections_per_day": 1,
                        "working_hours": [9, 17]
                    }
                }
            },
            "performance": {
                "name": "Performance Testing",
                "description": "High-performance settings for stress testing",
                "settings": {
                    "simulation": {
                        "auto_optimization": True,
                        "auto_bin_filling": True,
                        "truck_breakdown_probability": 0.0,
                        "bin_overflow_enabled": True,
                        "depot_processing_enabled": True,
                        "emit_frequency": 5,
                        "max_trucks_per_optimization": 20
                    },
                    "traffic": {
                        "mode": "auto"
                    },
                    "threshold": {
                        "mode": "dynamic",
                        "static_thresholds": {
                            "general": 95.0,
                            "recyclable": 95.0,
                            "hazardous": 95.0
                        },
                        "dynamic_config": {
                            "base_threshold": 95.0,
                            "eta_weight": 0.5,
                            "traffic_weight": 0.4,
                            "priority_weight": 0.3,
                            "fill_rate_weight": 0.3,
                            "time_weight": 0.2,
                            "capacity_weight": 0.3
                        }
                    },
                    "optimization": {
                        "vrp_time_limit_seconds": 60,
                        "knapsack_time_limit_seconds": 10,
                        "max_route_distance_km": 200,
                        "max_route_duration_minutes": 480,
                        "depot_return_required": True,
                        "vehicle_capacity_buffer": 0.01,
                        "radar_check_interval_minutes": 0.5,
                        "urgency_threshold": 95.0,
                        "optimization_algorithm": "guided_local_search"
                    },
                    "scheduler": {
                        "collections_per_day": 6,
                        "working_hours": [4, 22]
                    }
                }
            },
            "eco_friendly": {
                "name": "Eco-Friendly Operations",
                "description": "Environmentally conscious settings with emphasis on recycling",
                "settings": {
                    "simulation": {
                        "auto_optimization": True,
                        "auto_bin_filling": True,
                        "truck_breakdown_probability": 0.001,
                        "bin_overflow_enabled": True,
                        "depot_processing_enabled": True,
                        "emit_frequency": 1,
                        "max_trucks_per_optimization": 12
                    },
                    "traffic": {
                        "mode": "auto"
                    },
                    "threshold": {
                        "mode": "static",
                        "static_thresholds": {
                            "general": 85.0,
                            "recyclable": 70.0,  # Lower threshold for recyclables
                            "hazardous": 60.0    # Much lower for hazardous
                        }
                    },
                    "optimization": {
                        "vrp_time_limit_seconds": 40,
                        "knapsack_time_limit_seconds": 6,
                        "max_route_distance_km": 90,
                        "max_route_duration_minutes": 250,
                        "depot_return_required": True,
                        "vehicle_capacity_buffer": 0.05,
                        "radar_check_interval_minutes": 2,
                        "urgency_threshold": 80.0,
                        "optimization_algorithm": "auto"
                    },
                    "scheduler": {
                        "collections_per_day": 3,
                        "working_hours": [7, 18]
                    }
                }
            }
        }
    except Exception as e:
        logger.error(f"Failed to validate settings: {e}")
        return jsonify({"success": False, "error": str(e)}), 500