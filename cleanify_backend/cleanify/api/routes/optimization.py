"""
Enhanced optimization routes with auto/manual mode support.
"""
from flask import Blueprint, request, jsonify, current_app
from werkzeug.local import LocalProxy
from typing import Dict, Any, List
import logging
from datetime import datetime, timedelta
simulation_service = LocalProxy(lambda: current_app.simulation_service)
from cleanify.core.models.bin import BinStatus

bp = Blueprint("optimization", __name__)
logger = logging.getLogger(__name__)


@bp.route("/mode", methods=["GET"])
def get_optimization_mode():
    """Get current optimization mode (auto/manual)"""
    try:
        mode = simulation_service.config.get("optimization_mode", "auto")
        auto_config = {
            "interval_minutes": simulation_service.config.get("auto_optimization_interval_minutes", 5),
            "urgent_threshold": simulation_service.config.get("urgent_bin_threshold", 90.0)
        }
        
        return jsonify({
            "success": True,
            "mode": mode,
            "auto_config": auto_config,
            "is_auto": mode == "auto"
        })
        
    except Exception as e:
        logger.error(f"Failed to get optimization mode: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/mode", methods=["POST"])
def set_optimization_mode():
    """Set optimization mode (auto/manual)"""
    try:
        data = request.get_json()
        
        if not data or "mode" not in data:
            return jsonify({"success": False, "error": "Mode not provided"}), 400
        
        mode = data["mode"]
        
        if mode not in ["auto", "manual"]:
            return jsonify({"success": False, "error": "Mode must be 'auto' or 'manual'"}), 400
        
        # Set the mode
        simulation_service.set_optimization_mode(mode)
        
        # Configure auto-optimization if provided
        if mode == "auto" and "auto_config" in data:
            auto_config = data["auto_config"]
            interval = auto_config.get("interval_minutes", 5)
            threshold = auto_config.get("urgent_threshold", 90.0)
            simulation_service.configure_auto_optimization(interval, threshold)
        
        return jsonify({
            "success": True,
            "message": f"Optimization mode set to {mode}",
            "mode": mode,
            "config": simulation_service.config
        })
        
    except Exception as e:
        logger.error(f"Failed to set optimization mode: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/optimize", methods=["POST"])
def trigger_optimization():
    """Trigger optimization (manual mode) or force optimization (auto mode)"""
    try:
        logger.info("🚀 Optimization triggered...")
        data = request.get_json() or {}
        
        current_mode = simulation_service.config.get("optimization_mode", "auto")
        
        if current_mode == "manual":
            # Manual optimization
            result = simulation_service.trigger_manual_optimization()
            message = "Manual optimization completed"
        else:
            # Force optimization in auto mode
            available_trucks = [t for t in simulation_service.trucks if t.is_available()]
            bins_needing_collection = simulation_service._get_bins_needing_collection()
            
            if not available_trucks:
                return jsonify({
                    "success": False,
                    "error": "No available trucks for optimization"
                }), 400
            
            if not bins_needing_collection:
                return jsonify({
                    "success": True,
                    "message": "No bins need collection at this time",
                    "optimization_result": {
                        "routes": {},
                        "bins_assigned": 0,
                        "trucks_used": 0
                    }
                })
            
            result = simulation_service.optimization_svc.full_reoptimize(
                available_trucks, bins_needing_collection
            )
            
            # Store route geometries for trucks
            if result.get("success") and "routes" in result:
                for truck_id, route_data in result["routes"].items():
                    if "route_geometry" in route_data:
                        simulation_service.truck_routes_geometry[truck_id] = route_data["route_geometry"]
            
            message = "Forced optimization completed (auto mode)"
        
        if result.get("success"):
            return jsonify({
                "success": True,
                "message": message,
                "optimization_result": result,
                "mode": current_mode,
                "trucks_optimized": result.get("trucks_used", 0),
                "bins_considered": result.get("bins_assigned", 0)
            })
        else:
            return jsonify({
                "success": False,
                "error": result.get("error", "Optimization failed"),
                "mode": current_mode
            }), 500
        
    except Exception as e:
        logger.error(f"❌ Optimization error: {type(e).__name__}: {e}")
        return jsonify({
            "success": False, 
            "error": str(e),
            "error_type": type(e).__name__
        }), 500


@bp.route("/optimize/urgent", methods=["POST"])
def optimize_urgent():
    """Optimize only for urgent bins (above threshold)"""
    try:
        # Find urgent bins
        urgent_bins = simulation_service._get_urgent_bins()
        
        if not urgent_bins:
            return jsonify({
                "success": True,
                "message": "No urgent bins found",
                "urgent_bins": 0
            })
        
        available_trucks = [t for t in simulation_service.trucks if t.is_available()]
        
        if not available_trucks:
            return jsonify({
                "success": False,
                "error": "No available trucks for urgent optimization"
            }), 400
        
        # Trigger optimization for urgent bins
        result = simulation_service.optimization_svc.full_reoptimize(
            available_trucks, urgent_bins
        )
        
        # Store route geometries
        if result.get("success") and "routes" in result:
            for truck_id, route_data in result["routes"].items():
                if "route_geometry" in route_data:
                    simulation_service.truck_routes_geometry[truck_id] = route_data["route_geometry"]
        
        return jsonify({
            "success": True,
            "message": f"Urgent optimization completed for {len(urgent_bins)} bins",
            "urgent_bins": len(urgent_bins),
            "optimization_result": result
        })
        
    except Exception as e:
        logger.error(f"Urgent optimization failed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/routes", methods=["GET"])
def get_current_routes():
    """Get current routes for all trucks with enhanced geometry support"""
    try:
        routes = {}
        
        for truck in simulation_service.trucks:
            if truck.route:
                route_details = []
                for bin_id in truck.route:
                    bin_obj = next((b for b in simulation_service.bins if b.id == bin_id), None)
                    if bin_obj:
                        route_details.append({
                            "bin_id": bin_id,
                            "location": list(bin_obj.location),
                            "fill_level": bin_obj.fill_level,
                            "type": bin_obj.type.value,
                            "estimated_load": (bin_obj.fill_level / 100.0) * bin_obj.capacity
                        })
                
                # Get stored route geometry
                route_geometry = simulation_service.get_route_geometry(truck.id)
                
                # If no stored geometry, try to generate it
                if not route_geometry and route_details and len(route_details) > 0:
                    try:
                        # Build coordinate list: depot -> bins -> depot
                        coordinates = [truck.depot_location]
                        coordinates.extend([detail["location"] for detail in route_details])
                        coordinates.append(truck.depot_location)
                        
                        # Get route geometry from OSRM
                        if simulation_service.optimization_svc.osrm_service:
                            route_result = simulation_service.optimization_svc.osrm_service.route(
                                coordinates,
                                options={
                                    'overview': 'full',
                                    'geometries': 'geojson'
                                }
                            )
                            
                            if 'routes' in route_result and route_result['routes']:
                                geometry = route_result['routes'][0].get('geometry', {})
                                if 'coordinates' in geometry:
                                    # Convert [lon, lat] to [lat, lon] for frontend
                                    route_geometry = [[coord[1], coord[0]] for coord in geometry['coordinates']]
                                    # Store for future use
                                    simulation_service.truck_routes_geometry[truck.id] = route_geometry
                                    
                    except Exception as e:
                        logger.warning(f"Failed to get route geometry for truck {truck.id}: {e}")
                        # Fallback to straight lines
                        coordinates = [truck.depot_location]
                        coordinates.extend([detail["location"] for detail in route_details])
                        coordinates.append(truck.depot_location)
                        route_geometry = [[coord[1], coord[0]] for coord in coordinates]
                
                routes[truck.id] = {
                    "truck_id": truck.id,
                    "status": truck.status.value,
                    "current_location": list(truck.location),
                    "current_load": truck.load,
                    "capacity": truck.capacity,
                    "route": truck.route.copy(),
                    "current_route_index": truck.current_route_index,
                    "next_destination": truck.get_next_destination(),
                    "route_details": route_details,
                    "route_geometry": route_geometry,
                    "estimated_total_load": sum(
                        detail["estimated_load"] for detail in route_details
                    ),
                    "route_progress": (
                        truck.current_route_index / max(1, len(truck.route)) * 100
                        if truck.route else 0
                    ),
                    "has_osrm_geometry": len(route_geometry) > len(route_details) + 2 if route_geometry else False
                }
        
        return jsonify({
            "success": True,
            "routes": routes,
            "total_trucks": len(simulation_service.trucks),
            "trucks_with_routes": len(routes),
            "active_routes": len([r for r in routes.values() if r["route"]]),
            "optimization_mode": simulation_service.config.get("optimization_mode", "auto")
        })
        
    except Exception as e:
        logger.error(f"Failed to get current routes: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/routes/<truck_id>", methods=["GET"])
def get_truck_route(truck_id: str):
    """Get detailed route information for specific truck"""
    try:
        truck = next((t for t in simulation_service.trucks if t.id == truck_id), None)
        
        if not truck:
            return jsonify({"success": False, "error": "Truck not found"}), 404
        
        if not truck.route:
            return jsonify({
                "success": True,
                "message": "Truck has no assigned route",
                "truck_id": truck_id,
                "route": None
            })
        
        # Build detailed route information
        route_details = []
        total_estimated_load = 0
        total_estimated_distance = 0
        
        # Add depot as starting point
        route_points = [truck.depot_location]
        
        for i, bin_id in enumerate(truck.route):
            bin_obj = next((b for b in simulation_service.bins if b.id == bin_id), None)
            if bin_obj:
                estimated_load = (bin_obj.fill_level / 100.0) * bin_obj.capacity
                total_estimated_load += estimated_load
                
                # Calculate distance from previous point
                prev_location = route_points[-1]
                if simulation_service.osrm_service:
                    try:
                        distance = simulation_service.osrm_service.calculate_distance(
                            prev_location, bin_obj.location
                        )
                        total_estimated_distance += distance
                    except:
                        distance = 0
                else:
                    distance = 0
                
                route_details.append({
                    "sequence": i + 1,
                    "bin_id": bin_id,
                    "location": list(bin_obj.location),
                    "fill_level": bin_obj.fill_level,
                    "type": bin_obj.type.value,
                    "priority": getattr(bin_obj, 'priority', 1),
                    "estimated_load": estimated_load,
                    "distance_from_previous": distance,
                    "is_next": i == truck.current_route_index,
                    "is_completed": i < truck.current_route_index,
                    "threshold": simulation_service.threshold_service.threshold_for(bin_obj),
                    "needs_collection": bin_obj.needs_collection(
                        simulation_service.threshold_service.threshold_for(bin_obj)
                    )
                })
                
                route_points.append(bin_obj.location)
        
        # Add return to depot
        if route_points:
            final_distance = 0
            if simulation_service.osrm_service:
                try:
                    final_distance = simulation_service.osrm_service.calculate_distance(
                        route_points[-1], truck.depot_location
                    )
                    total_estimated_distance += final_distance
                except:
                    pass
        
        # Calculate estimated time
        estimated_time = 0
        if simulation_service.osrm_service and simulation_service.traffic_service:
            traffic_mult = simulation_service.traffic_service.current_multiplier()
            estimated_time = (total_estimated_distance / truck.speed * 60) * traffic_mult
        
        # Get route geometry
        route_geometry = simulation_service.get_route_geometry(truck_id)
        
        return jsonify({
            "success": True,
            "truck_id": truck_id,
            "route": {
                "truck_status": truck.status.value,
                "current_location": list(truck.location),
                "depot_location": list(truck.depot_location),
                "current_load": truck.load,
                "capacity": truck.capacity,
                "route_bins": truck.route.copy(),
                "current_route_index": truck.current_route_index,
                "next_destination": truck.get_next_destination(),
                "route_details": route_details,
                "route_geometry": route_geometry,
                "route_summary": {
                    "total_bins": len(truck.route),
                    "completed_bins": truck.current_route_index,
                    "remaining_bins": len(truck.route) - truck.current_route_index,
                    "estimated_total_load": total_estimated_load,
                    "estimated_total_distance": total_estimated_distance,
                    "estimated_time_minutes": estimated_time,
                    "capacity_utilization": (
                        (truck.load + total_estimated_load) / truck.capacity * 100
                        if truck.capacity > 0 else 0
                    ),
                    "route_progress": (
                        truck.current_route_index / max(1, len(truck.route)) * 100
                    ),
                    "has_osrm_geometry": len(route_geometry) > len(route_details) + 2 if route_geometry else False
                },
                "return_to_depot_distance": final_distance
            }
        })
        
    except Exception as e:
        logger.error(f"Failed to get route for truck {truck_id}: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/auto_config", methods=["GET"])
def get_auto_optimization_config():
    """Get auto-optimization configuration"""
    try:
        config = {
            "enabled": simulation_service.config.get("optimization_mode") == "auto",
            "interval_minutes": simulation_service.config.get("auto_optimization_interval_minutes", 5),
            "urgent_threshold": simulation_service.config.get("urgent_bin_threshold", 90.0),
            "last_optimization": getattr(simulation_service, 'last_auto_optimization', datetime.now()).isoformat(),
            "next_scheduled": None
        }
        
        # Calculate next scheduled optimization
        if config["enabled"]:
            from datetime import datetime, timedelta
            try:
                last_opt = simulation_service.last_auto_optimization
                next_opt = last_opt + timedelta(minutes=config["interval_minutes"])
                config["next_scheduled"] = next_opt.isoformat()
            except (AttributeError, TypeError):
                # Handle case where last_auto_optimization is not set
                config["next_scheduled"] = None
        
        return jsonify({
            "success": True,
            "auto_optimization": config
        })
        
    except Exception as e:
        logger.error(f"Failed to get auto-optimization config: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/auto_config", methods=["POST"])
def update_auto_optimization_config():
    """Update auto-optimization configuration"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No configuration provided"}), 400
        
        interval = data.get("interval_minutes", 5)
        threshold = data.get("urgent_threshold", 90.0)
        
        if not (1 <= interval <= 60):
            return jsonify({"success": False, "error": "Interval must be between 1 and 60 minutes"}), 400
        
        if not (50 <= threshold <= 100):
            return jsonify({"success": False, "error": "Urgent threshold must be between 50 and 100"}), 400
        
        simulation_service.configure_auto_optimization(interval, threshold)
        
        return jsonify({
            "success": True,
            "message": "Auto-optimization configuration updated",
            "config": {
                "interval_minutes": interval,
                "urgent_threshold": threshold
            }
        })
        
    except Exception as e:
        logger.error(f"Failed to update auto-optimization config: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/status", methods=["GET"])
def get_optimization_status():
    """Get comprehensive optimization status"""
    try:
        current_mode = simulation_service.config.get("optimization_mode", "auto")
        
        # Get basic stats
        available_trucks = [t for t in simulation_service.trucks if t.is_available()]
        trucks_with_routes = [t for t in simulation_service.trucks if t.route]
        bins_needing_collection = simulation_service._get_bins_needing_collection()
        urgent_bins = simulation_service._get_urgent_bins()
        
        # Get last optimization info
        last_optimization = getattr(simulation_service, 'last_auto_optimization', None)
        
        status = {
            "mode": current_mode,
            "is_auto": current_mode == "auto",
            "trucks": {
                "total": len(simulation_service.trucks),
                "available": len(available_trucks),
                "with_routes": len(trucks_with_routes),
                "utilization": len(trucks_with_routes) / max(1, len(available_trucks)) * 100
            },
            "bins": {
                "total": len(simulation_service.bins),
                "needing_collection": len(bins_needing_collection),
                "urgent": len(urgent_bins),
                "urgent_threshold": simulation_service.config.get("urgent_bin_threshold", 90.0)
            },
            "optimization": {
                "last_run": last_optimization.isoformat() if last_optimization else None,
                "auto_interval_minutes": simulation_service.config.get("auto_optimization_interval_minutes", 5),
                "routes_with_geometry": len([
                    truck_id for truck_id in simulation_service.truck_routes_geometry 
                    if simulation_service.truck_routes_geometry[truck_id]
                ])
            }
        }
        
        # Add next scheduled optimization for auto mode
        if current_mode == "auto" and last_optimization:
            try:
                from datetime import timedelta
                next_scheduled = last_optimization + timedelta(
                    minutes=simulation_service.config.get("auto_optimization_interval_minutes", 5)
                )
                status["optimization"]["next_scheduled"] = next_scheduled.isoformat()
            except (AttributeError, TypeError):
                status["optimization"]["next_scheduled"] = None
        
        return jsonify({
            "success": True,
            "status": status
        })
        
    except Exception as e:
        logger.error(f"Failed to get optimization status: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/statistics", methods=["GET"])
def get_optimization_statistics():
    """Get optimization service statistics and performance metrics"""
    try:
        stats = simulation_service.optimization_svc.get_statistics()
        
        # Add current state information
        available_trucks = len([t for t in simulation_service.trucks if t.is_available()])
        trucks_with_routes = len([t for t in simulation_service.trucks if t.route])
        
        urgent_bins = simulation_service._get_urgent_bins()
        
        stats["current_state"] = {
            "available_trucks": available_trucks,
            "trucks_with_routes": trucks_with_routes,
            "urgent_bins": len(urgent_bins),
            "total_active_bins": len([b for b in simulation_service.bins if b.status.value == "active"]),
            "optimization_efficiency": (
                trucks_with_routes / max(1, available_trucks) * 100
                if available_trucks > 0 else 0
            ),
            "optimization_mode": simulation_service.config.get("optimization_mode", "auto")
        }
        
        return jsonify({
            "success": True,
            "statistics": stats
        })
        
    except Exception as e:
        logger.error(f"Failed to get optimization statistics: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/config", methods=["GET"])
def get_optimization_config():
    """Get current optimization configuration"""
    try:
        config = simulation_service.optimization_svc.config.copy()
        
        # Add simulation-level optimization config
        config.update({
            "optimization_mode": simulation_service.config.get("optimization_mode", "auto"),
            "auto_optimization_interval_minutes": simulation_service.config.get("auto_optimization_interval_minutes", 5),
            "urgent_bin_threshold": simulation_service.config.get("urgent_bin_threshold", 90.0),
            "use_osrm_routes": simulation_service.config.get("use_osrm_routes", True),
            "route_following_precision": simulation_service.config.get("route_following_precision", 0.01)
        })
        
        return jsonify({
            "success": True,
            "config": config
        })
        
    except Exception as e:
        logger.error(f"Failed to get optimization config: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/config", methods=["POST"])
def update_optimization_config():
    """Update optimization configuration"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No configuration data provided"}), 400
        
        # Update optimization service config
        opt_service_config = {k: v for k, v in data.items() 
                            if k in simulation_service.optimization_svc.config}
        if opt_service_config:
            simulation_service.optimization_svc.configure(opt_service_config)
        
        # Update simulation-level config
        sim_config = {k: v for k, v in data.items() 
                     if k in ["optimization_mode", "auto_optimization_interval_minutes", 
                             "urgent_bin_threshold", "use_osrm_routes", "route_following_precision"]}
        if sim_config:
            simulation_service.configure(sim_config)
        
        return jsonify({
            "success": True,
            "message": "Optimization configuration updated",
            "updated_config": {
                **simulation_service.optimization_svc.config,
                "optimization_mode": simulation_service.config.get("optimization_mode", "auto"),
                "auto_optimization_interval_minutes": simulation_service.config.get("auto_optimization_interval_minutes", 5),
                "urgent_bin_threshold": simulation_service.config.get("urgent_bin_threshold", 90.0)
            }
        })
        
    except Exception as e:
        logger.error(f"Failed to update optimization config: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/clear_all_routes", methods=["POST"])
def clear_all_routes():
    """Clear all truck routes and route geometries"""
    try:
        cleared_count = 0
        
        for truck in simulation_service.trucks:
            if truck.route:
                truck.assign_route([])
                cleared_count += 1
        
        # Clear route geometries
        simulation_service.truck_routes_geometry.clear()
        
        return jsonify({
            "success": True,
            "message": f"Cleared routes for {cleared_count} trucks",
            "trucks_cleared": cleared_count
        })
        
    except Exception as e:
        logger.error(f"Failed to clear all routes: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# Keep all existing endpoints...
@bp.route("/analyze", methods=["POST"])
def analyze_optimization():
    """Analyze optimization possibilities without applying changes"""
    try:
        data = request.get_json() or {}
        
        truck_ids = data.get("truck_ids")
        bin_ids = data.get("bin_ids")
        
        trucks_to_analyze = simulation_service.trucks
        if truck_ids:
            trucks_to_analyze = [t for t in simulation_service.trucks if t.id in truck_ids]
        
        bins_to_analyze = simulation_service.bins
        if bin_ids:
            bins_to_analyze = [b for b in simulation_service.bins if b.id in bin_ids]
        
        available_trucks = [t for t in trucks_to_analyze if t.is_available()]
        active_bins = [b for b in bins_to_analyze if b.status.value == "active"]
        
        urgent_bins = []
        for bin_obj in active_bins:
            threshold = simulation_service.threshold_service.threshold_for(bin_obj)
            if bin_obj.fill_level >= threshold:
                urgent_bins.append(bin_obj)
        
        if urgent_bins and available_trucks:
            allocation_result = simulation_service.optimization_svc._allocate_bins_to_trucks(
                available_trucks, urgent_bins
            )
        else:
            allocation_result = {"allocations": {}, "total_bins_allocated": 0}
        
        current_efficiency = 0
        if available_trucks:
            trucks_with_work = len([t for t in available_trucks if t.route])
            current_efficiency = trucks_with_work / len(available_trucks) * 100
        
        potential_efficiency = 0
        if allocation_result["allocations"]:
            trucks_that_would_work = len([
                a for a in allocation_result["allocations"].values() 
                if a["num_bins"] > 0
            ])
            potential_efficiency = trucks_that_would_work / len(available_trucks) * 100
        
        return jsonify({
            "success": True,
            "analysis": {
                "input": {
                    "trucks_analyzed": len(trucks_to_analyze),
                    "available_trucks": len(available_trucks),
                    "bins_analyzed": len(bins_to_analyze),
                    "active_bins": len(active_bins),
                    "urgent_bins": len(urgent_bins)
                },
                "current_state": {
                    "trucks_with_routes": len([t for t in available_trucks if t.route]),
                    "current_efficiency": round(current_efficiency, 2),
                    "total_current_load": sum(t.load for t in available_trucks),
                    "optimization_mode": simulation_service.config.get("optimization_mode", "auto")
                },
                "optimization_potential": {
                    "bins_that_could_be_assigned": allocation_result["total_bins_allocated"],
                    "trucks_that_would_work": len([
                        a for a in allocation_result["allocations"].values() 
                        if a["num_bins"] > 0
                    ]),
                    "potential_efficiency": round(potential_efficiency, 2),
                    "efficiency_improvement": round(potential_efficiency - current_efficiency, 2)
                },
                "capacity_allocation": allocation_result,
                "recommendations": _generate_optimization_recommendations(
                    available_trucks, urgent_bins, allocation_result
                )
            }
        })
        
    except Exception as e:
        logger.error(f"Failed to analyze optimization: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


def _generate_optimization_recommendations(trucks, bins, allocation_result):
    """Generate optimization recommendations based on analysis"""
    recommendations = []
    
    if not bins:
        recommendations.append({
            "type": "info",
            "message": "No bins need collection at this time"
        })
        return recommendations
    
    if not trucks:
        recommendations.append({
            "type": "warning",
            "message": "No trucks available for optimization"
        })
        return recommendations
    
    underutilized = [
        t for t in trucks 
        if not t.route and t.is_available()
    ]
    
    if underutilized:
        recommendations.append({
            "type": "suggestion",
            "message": f"{len(underutilized)} trucks are idle and could be assigned routes"
        })
    
    total_bin_load = sum((b.fill_level / 100.0) * b.capacity for b in bins)
    total_truck_capacity = sum(t.capacity - t.load for t in trucks)
    
    if total_bin_load > total_truck_capacity:
        recommendations.append({
            "type": "warning",
            "message": "Total bin load exceeds available truck capacity"
        })
    
    assigned_bins = allocation_result["total_bins_allocated"]
    if assigned_bins < len(bins):
        unassigned = len(bins) - assigned_bins
        recommendations.append({
            "type": "info",
            "message": f"{unassigned} bins could not be assigned due to capacity constraints"
        })
    
    return recommendations


@bp.route("/test_algorithms", methods=["POST"])
def test_optimization_algorithms():
    """Test different optimization algorithms and compare results"""
    try:
        data = request.get_json() or {}
        
        algorithm_list = data.get("algorithms", ["greedy", "dp"])
        test_bins_count = data.get("test_bins_count", 10)
        
        available_trucks = [t for t in simulation_service.trucks if t.is_available()][:3]
        test_bins = [
            b for b in simulation_service.bins 
            if b.status.value == "active"
        ][:test_bins_count]
        
        if not available_trucks or not test_bins:
            return jsonify({
                "success": False,
                "error": "Insufficient trucks or bins for testing"
            }), 400
        
        results = {}
        
        for algorithm in algorithm_list:
            try:
                from cleanify.core.services.knapsack import KnapsackSolver, BinKnapsackOptimizer
                
                solver = KnapsackSolver()
                optimizer = BinKnapsackOptimizer(solver)
                
                import time
                start_time = time.perf_counter()
                
                result = optimizer.optimize_multi_truck_allocation(available_trucks, test_bins)
                
                end_time = time.perf_counter()
                
                results[algorithm] = {
                    "algorithm": algorithm,
                    "execution_time": end_time - start_time,
                    "bins_allocated": result["total_bins_allocated"],
                    "trucks_used": result["num_trucks_used"],
                    "total_weight": result["total_weight_allocated"],
                    "success": True
                }
                
            except Exception as e:
                results[algorithm] = {
                    "algorithm": algorithm,
                    "error": str(e),
                    "success": False
                }
        
        return jsonify({
            "success": True,
            "test_results": results,
            "test_parameters": {
                "trucks_tested": len(available_trucks),
                "bins_tested": len(test_bins),
                "algorithms_tested": algorithm_list
            }
        })
        
    except Exception as e:
        logger.error(f"Failed to test optimization algorithms: {e}")
        return jsonify({"success": False, "error": str(e)}), 500