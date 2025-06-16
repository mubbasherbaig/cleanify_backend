"""
Trigger manual optimization, return route JSON.
Keep route functions thin - delegate to optimization service.
"""
from flask import Blueprint, request, jsonify
from typing import Dict, Any, List
import logging
from cleanify import simulation_service
from cleanify.core.models.bin import BinStatus

bp = Blueprint("optimization", __name__)
logger = logging.getLogger(__name__)


@bp.route("/optimize", methods=["POST"])
def trigger_optimization():
    """Trigger full optimization for all available trucks and bins"""
    try:
        data = request.get_json() or {}
        
        # Get optional filters
        truck_ids = data.get("truck_ids")  # Specific trucks to optimize
        bin_ids = data.get("bin_ids")      # Specific bins to include
        force_all_bins = data.get("force_all_bins", False)  # Include all bins regardless of threshold
        
        # Get trucks to optimize
        trucks_to_optimize = simulation_service.trucks
        if truck_ids:
            trucks_to_optimize = [
                t for t in simulation_service.trucks 
                if t.id in truck_ids and t.is_available()
            ]
        else:
            trucks_to_optimize = [t for t in simulation_service.trucks if t.is_available()]
        
        if not trucks_to_optimize:
            return jsonify({
                "success": False,
                "error": "No available trucks for optimization"
            }), 400
        
        # Get bins to include
        bins_to_include = []
        if bin_ids:
            # Use specific bins
            bins_to_include = [
                b for b in simulation_service.bins 
                if b.id in bin_ids and b.status == BinStatus.ACTIVE
            ]
        elif force_all_bins:
            # Use all active bins
            bins_to_include = [
                b for b in simulation_service.bins 
                if b.status == BinStatus.ACTIVE
            ]
        else:
            # Use only bins that need collection
            bins_to_include = []
            for bin_obj in simulation_service.bins:
                if bin_obj.status == BinStatus.ACTIVE:
                    threshold = simulation_service.threshold_service.threshold_for(bin_obj)
                    if bin_obj.fill_level >= threshold:
                        bins_to_include.append(bin_obj)
        
        if not bins_to_include:
            return jsonify({
                "success": True,
                "message": "No bins need collection at this time",
                "optimization_result": {
                    "routes": {},
                    "bins_assigned": 0,
                    "trucks_used": 0
                }
            })
        
        # Trigger optimization
        result = simulation_service.optimization_svc.full_reoptimize(
            trucks_to_optimize, bins_to_include
        )
        
        return jsonify({
            "success": True,
            "message": f"Optimization completed for {len(trucks_to_optimize)} trucks and {len(bins_to_include)} bins",
            "optimization_result": result,
            "trucks_optimized": len(trucks_to_optimize),
            "bins_considered": len(bins_to_include)
        })
        
    except Exception as e:
        logger.error(f"Optimization failed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/optimize/urgent", methods=["POST"])
def optimize_urgent():
    """Optimize only for urgent bins (above threshold)"""
    try:
        # Find urgent bins
        urgent_bins = []
        for bin_obj in simulation_service.bins:
            if bin_obj.status == BinStatus.ACTIVE:
                threshold = simulation_service.threshold_service.threshold_for(bin_obj)
                if bin_obj.fill_level >= threshold:
                    urgent_bins.append(bin_obj)
        
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
    """Get current routes for all trucks"""
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
                    "estimated_total_load": sum(
                        detail["estimated_load"] for detail in route_details
                    ),
                    "route_progress": (
                        truck.current_route_index / max(1, len(truck.route)) * 100
                        if truck.route else 0
                    )
                }
        
        return jsonify({
            "success": True,
            "routes": routes,
            "total_trucks": len(simulation_service.trucks),
            "trucks_with_routes": len(routes),
            "active_routes": len([r for r in routes.values() if r["route"]])
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
                    )
                },
                "return_to_depot_distance": final_distance
            }
        })
        
    except Exception as e:
        logger.error(f"Failed to get route for truck {truck_id}: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/statistics", methods=["GET"])
def get_optimization_statistics():
    """Get optimization service statistics and performance metrics"""
    try:
        stats = simulation_service.optimization_svc.get_statistics()
        
        # Add current state information
        available_trucks = len([t for t in simulation_service.trucks if t.is_available()])
        trucks_with_routes = len([t for t in simulation_service.trucks if t.route])
        
        urgent_bins = []
        for bin_obj in simulation_service.bins:
            if bin_obj.status.value == "active":
                threshold = simulation_service.threshold_service.threshold_for(bin_obj)
                if bin_obj.fill_level >= threshold:
                    urgent_bins.append(bin_obj.id)
        
        stats["current_state"] = {
            "available_trucks": available_trucks,
            "trucks_with_routes": trucks_with_routes,
            "urgent_bins": len(urgent_bins),
            "total_active_bins": len([b for b in simulation_service.bins if b.status.value == "active"]),
            "optimization_efficiency": (
                trucks_with_routes / max(1, available_trucks) * 100
                if available_trucks > 0 else 0
            )
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
        
        # Validate configuration values
        valid_keys = simulation_service.optimization_svc.config.keys()
        invalid_keys = [k for k in data.keys() if k not in valid_keys]
        
        if invalid_keys:
            return jsonify({
                "success": False,
                "error": f"Invalid configuration keys: {invalid_keys}",
                "valid_keys": list(valid_keys)
            }), 400
        
        # Apply configuration
        simulation_service.optimization_svc.configure(data)
        
        return jsonify({
            "success": True,
            "message": "Optimization configuration updated",
            "updated_config": simulation_service.optimization_svc.config.copy()
        })
        
    except Exception as e:
        logger.error(f"Failed to update optimization config: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/analyze", methods=["POST"])
def analyze_optimization():
    """Analyze optimization possibilities without applying changes"""
    try:
        data = request.get_json() or {}
        
        # Get trucks and bins to analyze
        truck_ids = data.get("truck_ids")
        bin_ids = data.get("bin_ids")
        
        trucks_to_analyze = simulation_service.trucks
        if truck_ids:
            trucks_to_analyze = [t for t in simulation_service.trucks if t.id in truck_ids]
        
        bins_to_analyze = simulation_service.bins
        if bin_ids:
            bins_to_analyze = [b for b in simulation_service.bins if b.id in bin_ids]
        
        # Filter to available trucks and active bins
        available_trucks = [t for t in trucks_to_analyze if t.is_available()]
        active_bins = [b for b in bins_to_analyze if b.status.value == "active"]
        
        # Get bins that need collection
        urgent_bins = []
        for bin_obj in active_bins:
            threshold = simulation_service.threshold_service.threshold_for(bin_obj)
            if bin_obj.fill_level >= threshold:
                urgent_bins.append(bin_obj)
        
        # Analyze capacity allocation without optimizing
        if urgent_bins and available_trucks:
            allocation_result = simulation_service.optimization_svc._allocate_bins_to_trucks(
                available_trucks, urgent_bins
            )
        else:
            allocation_result = {"allocations": {}, "total_bins_allocated": 0}
        
        # Calculate potential improvements
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
                    "total_current_load": sum(t.load for t in available_trucks)
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
    
    # Check for underutilized trucks
    underutilized = [
        t for t in trucks 
        if not t.route and t.is_available()
    ]
    
    if underutilized:
        recommendations.append({
            "type": "suggestion",
            "message": f"{len(underutilized)} trucks are idle and could be assigned routes"
        })
    
    # Check for capacity issues
    total_bin_load = sum((b.fill_level / 100.0) * b.capacity for b in bins)
    total_truck_capacity = sum(t.capacity - t.load for t in trucks)
    
    if total_bin_load > total_truck_capacity:
        recommendations.append({
            "type": "warning",
            "message": "Total bin load exceeds available truck capacity"
        })
    
    # Check allocation efficiency
    assigned_bins = allocation_result["total_bins_allocated"]
    if assigned_bins < len(bins):
        unassigned = len(bins) - assigned_bins
        recommendations.append({
            "type": "info",
            "message": f"{unassigned} bins could not be assigned due to capacity constraints"
        })
    
    return recommendations


@bp.route("/clear_all_routes", methods=["POST"])
def clear_all_routes():
    """Clear all truck routes"""
    try:
        cleared_count = 0
        
        for truck in simulation_service.trucks:
            if truck.route:
                truck.assign_route([])
                cleared_count += 1
        
        return jsonify({
            "success": True,
            "message": f"Cleared routes for {cleared_count} trucks",
            "trucks_cleared": cleared_count
        })
        
    except Exception as e:
        logger.error(f"Failed to clear all routes: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/test_algorithms", methods=["POST"])
def test_optimization_algorithms():
    """Test different optimization algorithms and compare results"""
    try:
        data = request.get_json() or {}
        
        # Get test parameters
        algorithm_list = data.get("algorithms", ["greedy", "dp"])
        test_bins_count = data.get("test_bins_count", 10)
        
        # Get test data
        available_trucks = [t for t in simulation_service.trucks if t.is_available()][:3]  # Limit for testing
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
                # Test knapsack algorithm
                from cleanify.core.services.knapsack import KnapsackSolver, BinKnapsackOptimizer
                
                solver = KnapsackSolver()
                optimizer = BinKnapsackOptimizer(solver)
                
                # Run optimization
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