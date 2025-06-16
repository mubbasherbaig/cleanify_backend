"""
Play / pause / speed endpoints.
These all forward to SimulationService – keep route funcs thin.
"""
from flask import Blueprint, request, jsonify
from typing import Dict, Any
import logging
from cleanify import simulation_service

bp = Blueprint("simulation", __name__)
logger = logging.getLogger(__name__)


@bp.route("/start", methods=["POST"])
def start():
    """Start/Resume simulation"""
    try:
        simulation_service.resume()
        
        return jsonify({
            "success": True,
            "message": f"Cleared {events_count} events",
            "cleared_events": events_count
        })
        
    except Exception as e:
        logger.error(f"Failed to clear events: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/config", methods=["GET"])
def get_simulation_config():
    """Get simulation configuration"""
    try:
        config = simulation_service.config.copy()
        
        return jsonify({
            "success": True,
            "config": config
        })
        
    except Exception as e:
        logger.error(f"Failed to get simulation config: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/config", methods=["POST"])
def update_simulation_config():
    """Update simulation configuration"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No configuration data provided"}), 400
        
        simulation_service.configure(data)
        
        return jsonify({
            "success": True,
            "message": "Simulation configuration updated",
            "updated_config": simulation_service.config.copy()
        })
        
    except Exception as e:
        logger.error(f"Failed to update simulation config: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    try:
        health_status = {
            "simulation_running": simulation_service._running,
            "services": {
                "time_manager": True,
                "traffic_service": True,
                "threshold_service": True,
                "optimization_service": True,
                "osrm_service": simulation_service.osrm_service.is_available() if simulation_service.osrm_service else False
            },
            "data_integrity": {
                "trucks_count": len(simulation_service.trucks),
                "bins_count": len(simulation_service.bins),
                "depots_count": len(simulation_service.depots)
            },
            "performance": {
                "tick_count": simulation_service.tick_count,
                "events_logged": len(simulation_service.events_log),
                "uptime_seconds": simulation_service.time_manager.get_elapsed_real_time()
            }
        }
        
        all_services_healthy = all(health_status["services"].values())
        
        return jsonify({
            "success": True,
            "healthy": all_services_healthy,
            "health_status": health_status,
            "timestamp": simulation_service.time_manager.now().isoformat()
        }), 200 if all_services_healthy else 503
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            "success": False, 
            "healthy": False, 
            "error": str(e)
        }), 503


@bp.route("/snapshot", methods=["GET"])
def get_snapshot():
    """Get current simulation snapshot"""
    try:
        from datetime import datetime
        snapshot = simulation_service._snapshot(datetime.now())
        
        return jsonify({
            "success": True,
            "snapshot": snapshot
        })
        
    except Exception as e:
        logger.error(f"Failed to get snapshot: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/performance", methods=["GET"])
def get_performance_metrics():
    """Get simulation performance metrics"""
    try:
        time_manager_metrics = simulation_service.time_manager.get_performance_metrics()
        
        performance_metrics = {
            "time_management": time_manager_metrics,
            "simulation": {
                "ticks_per_second": simulation_service.tick_count / max(1, simulation_service.time_manager.get_elapsed_real_time()),
                "events_per_second": len(simulation_service.events_log) / max(1, simulation_service.time_manager.get_elapsed_real_time()),
                "collections_per_hour": simulation_service.total_collections / max(0.1, simulation_service.time_manager.get_elapsed_real_time() / 3600),
                "average_trucks_utilized": 0  # Would need historical tracking
            },
            "optimization": simulation_service.optimization_svc.get_statistics(),
            "traffic": simulation_service.traffic_service.get_status()
        }
        
        return jsonify({
            "success": True,
            "performance_metrics": performance_metrics
        })
        
    except Exception as e:
        logger.error(f"Failed to get performance metrics: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/pause", methods=["POST"])
def pause():
    """Pause simulation"""
    try:
        simulation_service.pause()
        
        return jsonify({
            "success": True,
            "status": "paused",
            "message": "Simulation paused",
            "current_time": simulation_service.time_manager.now().isoformat(),
            "speed": simulation_service.time_manager.speed
        })
        
    except Exception as e:
        logger.error(f"Failed to pause simulation: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/stop", methods=["POST"])
def stop():
    """Stop simulation"""
    try:
        simulation_service.stop()
        
        return jsonify({
            "success": True,
            "status": "stopped",
            "message": "Simulation stopped",
            "current_time": simulation_service.time_manager.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Failed to stop simulation: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/speed", methods=["POST"])
def set_speed():
    """Set simulation speed multiplier"""
    try:
        data = request.get_json()
        
        if not data or "speed" not in data:
            return jsonify({"success": False, "error": "Speed not provided"}), 400
        
        speed = int(data["speed"])
        
        if not (1 <= speed <= 10):
            return jsonify({"success": False, "error": "Speed must be between 1 and 10"}), 400
        
        simulation_service.set_speed(speed)
        
        return jsonify({
            "success": True,
            "message": f"Simulation speed set to {speed}x",
            "speed": speed,
            "current_time": simulation_service.time_manager.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Failed to set simulation speed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/status", methods=["GET"])
def get_status():
    """Get current simulation status"""
    try:
        status = {
            "is_running": simulation_service._running,
            "is_paused": simulation_service._paused,
            "current_time": simulation_service.time_manager.now().isoformat(),
            "speed": simulation_service.time_manager.speed,
            "tick_count": simulation_service.tick_count,
            "uptime_seconds": (
                simulation_service.time_manager.get_elapsed_real_time()
            ),
            "time_manager_status": simulation_service.time_manager.get_formatted_status(),
            "traffic_multiplier": simulation_service.traffic_service.current_multiplier(),
            "active_trucks": len([t for t in simulation_service.trucks if t.is_available()]),
            "total_trucks": len(simulation_service.trucks),
            "active_bins": len([b for b in simulation_service.bins if b.status.value == "active"]),
            "total_bins": len(simulation_service.bins),
            "bins_needing_collection": len([
                b for b in simulation_service.bins 
                if b.needs_collection(simulation_service.threshold_service.threshold_for(b))
            ])
        }
        
        return jsonify({
            "success": True,
            "status": status
        })
        
    except Exception as e:
        logger.error(f"Failed to get simulation status: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/statistics", methods=["GET"])
def get_statistics():
    """Get detailed simulation statistics"""
    try:
        stats = simulation_service.get_statistics()
        
        return jsonify({
            "success": True,
            "statistics": stats
        })
        
    except Exception as e:
        logger.error(f"Failed to get simulation statistics: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/time", methods=["GET"])
def get_time_info():
    """Get detailed time information"""
    try:
        time_info = simulation_service.time_manager.get_formatted_status()
        
        # Add additional time calculations
        current_sim_time = simulation_service.time_manager.now()
        time_info.update({
            "current_sim_time": current_sim_time.isoformat(),
            "current_hour": current_sim_time.hour,
            "current_minute": current_sim_time.minute,
            "day_of_week": current_sim_time.weekday(),
            "is_business_hours": simulation_service.time_manager.is_business_hours(),
            "is_weekend": simulation_service.time_manager.is_weekend()
        })
        
        return jsonify({
            "success": True,
            "time_info": time_info
        })
        
    except Exception as e:
        logger.error(f"Failed to get time info: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/time", methods=["POST"])
def set_time():
    """Set simulation time"""
    try:
        data = request.get_json()
        
        if not data or "time" not in data:
            return jsonify({"success": False, "error": "Time not provided"}), 400
        
        from datetime import datetime
        new_time = datetime.fromisoformat(data["time"].replace('Z', '+00:00'))
        
        simulation_service.time_manager.set_time(new_time)
        
        return jsonify({
            "success": True,
            "message": "Simulation time updated",
            "new_time": simulation_service.time_manager.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Failed to set simulation time: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/fast_forward", methods=["POST"])
def fast_forward():
    """Fast forward simulation by specified duration"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        # Accept different duration formats
        if "hours" in data:
            from datetime import timedelta
            duration = timedelta(hours=float(data["hours"]))
        elif "minutes" in data:
            from datetime import timedelta
            duration = timedelta(minutes=float(data["minutes"]))
        elif "seconds" in data:
            from datetime import timedelta
            duration = timedelta(seconds=float(data["seconds"]))
        else:
            return jsonify({
                "success": False, 
                "error": "Specify duration in hours, minutes, or seconds"
            }), 400
        
        old_time = simulation_service.time_manager.now()
        simulation_service.time_manager.fast_forward(duration)
        new_time = simulation_service.time_manager.now()
        
        return jsonify({
            "success": True,
            "message": f"Fast forwarded by {duration}",
            "old_time": old_time.isoformat(),
            "new_time": new_time.isoformat(),
            "duration_added": str(duration)
        })
        
    except Exception as e:
        logger.error(f"Failed to fast forward: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/reset", methods=["POST"])
def reset_simulation():
    """Reset simulation to initial state"""
    try:
        data = request.get_json() or {}
        
        # Reset time manager
        from datetime import datetime
        start_time = None
        if "start_time" in data:
            start_time = datetime.fromisoformat(data["start_time"].replace('Z', '+00:00'))
        
        simulation_service.time_manager.reset(start_time)
        
        # Reset statistics
        simulation_service.tick_count = 0
        simulation_service.total_collections = 0
        simulation_service.total_distance_traveled = 0.0
        simulation_service.simulation_start_time = datetime.now()
        
        # Reset trucks if requested
        if data.get("reset_trucks", False):
            for truck in simulation_service.trucks:
                truck.assign_route([])
                truck.empty_load()
                truck.refuel()
                truck.location = truck.depot_location
                truck.status = truck.status.IDLE
                truck.collections_today = 0
                truck.total_distance_traveled = 0.0
        
        # Reset bins if requested
        if data.get("reset_bins", False):
            for bin_obj in simulation_service.bins:
                bin_obj.fill_level = 0.0
                bin_obj.reset_status()
        
        # Reset optimization statistics
        if data.get("reset_optimization", False):
            simulation_service.optimization_svc.reset_statistics()
        
        # Clear events log
        simulation_service.events_log.clear()
        
        return jsonify({
            "success": True,
            "message": "Simulation reset successfully",
            "new_start_time": simulation_service.time_manager.now().isoformat(),
            "reset_options": {
                "trucks": data.get("reset_trucks", False),
                "bins": data.get("reset_bins", False),
                "optimization": data.get("reset_optimization", False)
            }
        })
        
    except Exception as e:
        logger.error(f"Failed to reset simulation: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/events", methods=["GET"])
def get_events():
    """Get recent simulation events"""
    try:
        limit = request.args.get("limit", 50, type=int)
        event_type = request.args.get("type")
        
        events = simulation_service.events_log
        
        # Filter by event type if specified
        if event_type:
            events = [e for e in events if e.get("type") == event_type]
        
        # Apply limit
        events = events[-limit:]
        
        return jsonify({
            "success": True,
            "events": events,
            "total_events": len(simulation_service.events_log),
            "filtered_events": len(events),
            "filters": {
                "limit": limit,
                "type": event_type
            }
        })
        
    except Exception as e:
        logger.error(f"Failed to get events: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/events", methods=["DELETE"])
def clear_events():
    """Clear simulation events log"""
    try:
        events_count = len(simulation_service.events_log)
        simulation_service.events_log.clear()
        
        return jsonify({
            "success": True,
            "message": f"Cleared {events_count} events",
            "cleared_events": events_count
        })
        
    except Exception as e:
        logger.error(f"Failed to clear events: {e}")
        return jsonify({"success": False, "error": str(e)}), 500