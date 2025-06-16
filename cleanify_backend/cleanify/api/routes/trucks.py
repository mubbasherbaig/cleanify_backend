"""
CRUD + capacity editing for trucks.
Keep route functions thin - delegate to services.
"""
from flask import Blueprint, request, jsonify
from typing import Dict, Any, List
import logging
from cleanify import simulation_service
from cleanify.core.models.truck import Truck, TruckStatus

bp = Blueprint("trucks", __name__)
logger = logging.getLogger(__name__)


@bp.route("/", methods=["GET"])
def get_trucks():
    """Get all trucks with optional filtering"""
    try:
        # Get query parameters
        status_filter = request.args.get("status")
        available_only = request.args.get("available", "").lower() == "true"
        limit = request.args.get("limit", type=int)
        
        trucks = simulation_service.trucks
        
        # Apply filters
        if status_filter:
            trucks = [t for t in trucks if t.status.value == status_filter]
        
        if available_only:
            trucks = [t for t in trucks if t.is_available()]
        
        # Apply limit
        if limit:
            trucks = trucks[:limit]
        
        # Convert to dict format
        trucks_data = [truck.as_dict() for truck in trucks]
        
        return jsonify({
            "success": True,
            "trucks": trucks_data,
            "total": len(trucks_data),
            "filters_applied": {
                "status": status_filter,
                "available_only": available_only,
                "limit": limit
            }
        })
        
    except Exception as e:
        logger.error(f"Failed to get trucks: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/<truck_id>", methods=["GET"])
def get_truck(truck_id: str):
    """Get specific truck by ID"""
    try:
        truck = next((t for t in simulation_service.trucks if t.id == truck_id), None)
        
        if not truck:
            return jsonify({"success": False, "error": "Truck not found"}), 404
        
        truck_data = truck.as_dict()
        
        # Add additional route information
        if truck.route:
            route_bins = []
            for bin_id in truck.route:
                bin_obj = next((b for b in simulation_service.bins if b.id == bin_id), None)
                if bin_obj:
                    route_bins.append({
                        "bin_id": bin_id,
                        "location": list(bin_obj.location),
                        "fill_level": bin_obj.fill_level,
                        "type": bin_obj.type.value
                    })
            truck_data["route_details"] = route_bins
        
        return jsonify({
            "success": True,
            "truck": truck_data
        })
        
    except Exception as e:
        logger.error(f"Failed to get truck {truck_id}: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/", methods=["POST"])
def create_truck():
    """Create new truck"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        # Validate required fields
        required_fields = ["id", "capacity"]
        for field in required_fields:
            if field not in data:
                return jsonify({"success": False, "error": f"Missing field: {field}"}), 400
        
        # Check if truck ID already exists
        if any(t.id == data["id"] for t in simulation_service.trucks):
            return jsonify({"success": False, "error": "Truck ID already exists"}), 400
        
        # Get depot location (use first depot or default)
        depot_location = (74.3587, 31.5204)  # Default Lahore location
        if simulation_service.depots:
            depot_location = simulation_service.depots[0].location
        
        # Create truck data
        truck_data = {
            "id": data["id"],
            "capacity": data["capacity"],
            "location": data.get("location", depot_location),
            "depot_location": data.get("depot_location", depot_location),
            "speed": data.get("speed", 50.0),
            "fuel_level": data.get("fuel_level", 100.0),
            "fuel_consumption": data.get("fuel_consumption", 0.1)
        }
        
        success = simulation_service.add_truck(truck_data)
        
        if success:
            return jsonify({"success": True, "message": "Truck created successfully"}), 201
        else:
            return jsonify({"success": False, "error": "Failed to create truck"}), 500
            
    except Exception as e:
        logger.error(f"Failed to create truck: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/<truck_id>", methods=["PUT"])
def update_truck(truck_id: str):
    """Update existing truck"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        truck = next((t for t in simulation_service.trucks if t.id == truck_id), None)
        
        if not truck:
            return jsonify({"success": False, "error": "Truck not found"}), 404
        
        # Update fields
        if "capacity" in data:
            if data["capacity"] <= 0:
                return jsonify({"success": False, "error": "Capacity must be positive"}), 400
            truck.capacity = data["capacity"]
        
        if "speed" in data:
            if data["speed"] <= 0:
                return jsonify({"success": False, "error": "Speed must be positive"}), 400
            truck.speed = data["speed"]
        
        if "fuel_level" in data:
            if not (0 <= data["fuel_level"] <= 100):
                return jsonify({"success": False, "error": "Fuel level must be 0-100"}), 400
            truck.fuel_level = data["fuel_level"]
        
        if "fuel_consumption" in data:
            if data["fuel_consumption"] < 0:
                return jsonify({"success": False, "error": "Fuel consumption cannot be negative"}), 400
            truck.fuel_consumption = data["fuel_consumption"]
        
        if "depot_location" in data:
            if not isinstance(data["depot_location"], list) or len(data["depot_location"]) != 2:
                return jsonify({"success": False, "error": "Depot location must be [longitude, latitude]"}), 400
            truck.depot_location = tuple(data["depot_location"])
        
        # Update timestamp
        from datetime import datetime
        truck.updated_at = datetime.now()
        
        return jsonify({
            "success": True,
            "message": "Truck updated successfully",
            "truck": truck.as_dict()
        })
        
    except Exception as e:
        logger.error(f"Failed to update truck {truck_id}: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/<truck_id>", methods=["DELETE"])
def delete_truck(truck_id: str):
    """Delete truck"""
    try:
        success = simulation_service.remove_truck(truck_id)
        
        if success:
            return jsonify({"success": True, "message": "Truck deleted successfully"})
        else:
            return jsonify({"success": False, "error": "Truck not found"}), 404
            
    except Exception as e:
        logger.error(f"Failed to delete truck {truck_id}: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/<truck_id>/route", methods=["POST"])
def assign_route(truck_id: str):
    """Assign route to truck"""
    try:
        data = request.get_json()
        
        if not data or "bin_ids" not in data:
            return jsonify({"success": False, "error": "No bin IDs provided"}), 400
        
        truck = next((t for t in simulation_service.trucks if t.id == truck_id), None)
        
        if not truck:
            return jsonify({"success": False, "error": "Truck not found"}), 404
        
        if not truck.is_available():
            return jsonify({
                "success": False, 
                "error": f"Truck not available (status: {truck.status.value})"
            }), 400
        
        bin_ids = data["bin_ids"]
        
        # Validate that bins exist
        invalid_bins = []
        for bin_id in bin_ids:
            if not any(b.id == bin_id for b in simulation_service.bins):
                invalid_bins.append(bin_id)
        
        if invalid_bins:
            return jsonify({
                "success": False, 
                "error": f"Invalid bin IDs: {invalid_bins}"
            }), 400
        
        # Assign route
        truck.assign_route(bin_ids)
        
        return jsonify({
            "success": True,
            "message": f"Route assigned to truck {truck_id}",
            "route": bin_ids,
            "truck": truck.as_dict()
        })
        
    except Exception as e:
        logger.error(f"Failed to assign route to truck {truck_id}: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/<truck_id>/route", methods=["DELETE"])
def clear_route(truck_id: str):
    """Clear truck route"""
    try:
        truck = next((t for t in simulation_service.trucks if t.id == truck_id), None)
        
        if not truck:
            return jsonify({"success": False, "error": "Truck not found"}), 404
        
        truck.assign_route([])  # Clear route
        
        return jsonify({
            "success": True,
            "message": f"Route cleared for truck {truck_id}",
            "truck": truck.as_dict()
        })
        
    except Exception as e:
        logger.error(f"Failed to clear route for truck {truck_id}: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/<truck_id>/maintenance", methods=["POST"])
def set_truck_maintenance(truck_id: str):
    """Set or complete truck maintenance"""
    try:
        data = request.get_json() or {}
        action = data.get("action", "start")  # "start" or "complete"
        
        truck = next((t for t in simulation_service.trucks if t.id == truck_id), None)
        
        if not truck:
            return jsonify({"success": False, "error": "Truck not found"}), 404
        
        if action == "start":
            truck.perform_maintenance()
            message = f"Maintenance started for truck {truck_id}"
        elif action == "complete":
            truck.complete_maintenance()
            message = f"Maintenance completed for truck {truck_id}"
        else:
            return jsonify({"success": False, "error": "Invalid action. Use 'start' or 'complete'"}), 400
        
        return jsonify({
            "success": True,
            "message": message,
            "truck": truck.as_dict()
        })
        
    except Exception as e:
        logger.error(f"Failed to set maintenance for truck {truck_id}: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/<truck_id>/refuel", methods=["POST"])
def refuel_truck(truck_id: str):
    """Refuel truck to full capacity"""
    try:
        truck = next((t for t in simulation_service.trucks if t.id == truck_id), None)
        
        if not truck:
            return jsonify({"success": False, "error": "Truck not found"}), 404
        
        truck.refuel()
        
        return jsonify({
            "success": True,
            "message": f"Truck {truck_id} refueled to 100%",
            "truck": truck.as_dict()
        })
        
    except Exception as e:
        logger.error(f"Failed to refuel truck {truck_id}: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/<truck_id>/empty", methods=["POST"])
def empty_truck(truck_id: str):
    """Manually empty truck load"""
    try:
        truck = next((t for t in simulation_service.trucks if t.id == truck_id), None)
        
        if not truck:
            return jsonify({"success": False, "error": "Truck not found"}), 404
        
        if truck.load <= 0:
            return jsonify({
                "success": False, 
                "error": "Truck is already empty"
            }), 400
        
        emptied_amount = truck.empty_load()
        
        return jsonify({
            "success": True,
            "message": f"Truck {truck_id} emptied",
            "emptied_amount": emptied_amount,
            "truck": truck.as_dict()
        })
        
    except Exception as e:
        logger.error(f"Failed to empty truck {truck_id}: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/<truck_id>/status", methods=["POST"])
def set_truck_status(truck_id: str):
    """Set truck online/offline status"""
    try:
        data = request.get_json()
        
        if not data or "status" not in data:
            return jsonify({"success": False, "error": "Status not provided"}), 400
        
        truck = next((t for t in simulation_service.trucks if t.id == truck_id), None)
        
        if not truck:
            return jsonify({"success": False, "error": "Truck not found"}), 404
        
        status = data["status"]
        
        if status == "online":
            truck.set_offline(False)
            message = f"Truck {truck_id} set online"
        elif status == "offline":
            truck.set_offline(True)
            message = f"Truck {truck_id} set offline"
        else:
            return jsonify({
                "success": False, 
                "error": "Invalid status. Use 'online' or 'offline'"
            }), 400
        
        return jsonify({
            "success": True,
            "message": message,
            "truck": truck.as_dict()
        })
        
    except Exception as e:
        logger.error(f"Failed to set status for truck {truck_id}: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/statistics", methods=["GET"])
def get_truck_statistics():
    """Get truck fleet statistics"""
    try:
        trucks = simulation_service.trucks
        
        # Basic counts
        total_trucks = len(trucks)
        available_trucks = len([t for t in trucks if t.is_available()])
        
        # Status distribution
        status_counts = {}
        for status in TruckStatus:
            status_counts[status.value] = len([t for t in trucks if t.status == status])
        
        # Capacity utilization
        total_capacity = sum(t.capacity for t in trucks)
        total_load = sum(t.load for t in trucks)
        avg_utilization = (total_load / total_capacity * 100) if total_capacity > 0 else 0
        
        # Fuel statistics
        fuel_levels = [t.fuel_level for t in trucks]
        avg_fuel = sum(fuel_levels) / len(fuel_levels) if fuel_levels else 0
        
        # Performance metrics
        total_distance = sum(t.total_distance_traveled for t in trucks)
        total_collections = sum(t.collections_today for t in trucks)
        
        # Efficiency calculations
        trucks_with_routes = len([t for t in trucks if t.route])
        route_efficiency = (trucks_with_routes / max(1, available_trucks) * 100) if available_trucks > 0 else 0
        
        return jsonify({
            "success": True,
            "statistics": {
                "fleet_overview": {
                    "total_trucks": total_trucks,
                    "available_trucks": available_trucks,
                    "trucks_with_routes": trucks_with_routes,
                    "availability_rate": (available_trucks / max(1, total_trucks) * 100)
                },
                "status_distribution": status_counts,
                "capacity_metrics": {
                    "total_capacity": total_capacity,
                    "total_current_load": total_load,
                    "average_utilization": round(avg_utilization, 2),
                    "available_capacity": total_capacity - total_load
                },
                "fuel_metrics": {
                    "average_fuel_level": round(avg_fuel, 2),
                    "trucks_low_fuel": len([t for t in trucks if t.fuel_level < 20]),
                    "trucks_need_refuel": len([t for t in trucks if t.fuel_level < 10])
                },
                "performance_metrics": {
                    "total_distance_traveled": total_distance,
                    "total_collections_today": total_collections,
                    "average_distance_per_truck": total_distance / max(1, total_trucks),
                    "average_collections_per_truck": total_collections / max(1, total_trucks),
                    "route_efficiency": round(route_efficiency, 2)
                },
                "maintenance_metrics": {
                    "trucks_in_maintenance": status_counts.get("maintenance", 0),
                    "trucks_needing_maintenance": len([t for t in trucks if t.needs_maintenance()])
                }
            }
        })
        
    except Exception as e:
        logger.error(f"Failed to get truck statistics: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/batch", methods=["POST"])
def batch_operations():
    """Perform batch operations on multiple trucks"""
    try:
        data = request.get_json()
        
        if not data or "operation" not in data:
            return jsonify({"success": False, "error": "Operation not specified"}), 400
        
        operation = data["operation"]
        truck_ids = data.get("truck_ids", [])
        
        if not truck_ids:
            return jsonify({"success": False, "error": "No truck IDs provided"}), 400
        
        results = []
        
        if operation == "refuel":
            # Batch refuel
            for truck_id in truck_ids:
                truck = next((t for t in simulation_service.trucks if t.id == truck_id), None)
                if truck:
                    truck.refuel()
                    results.append(f"Refueled {truck_id}")
        
        elif operation == "maintenance_start":
            # Batch maintenance start
            for truck_id in truck_ids:
                truck = next((t for t in simulation_service.trucks if t.id == truck_id), None)
                if truck and truck.status != TruckStatus.MAINTENANCE:
                    truck.perform_maintenance()
                    results.append(f"Started maintenance for {truck_id}")
        
        elif operation == "maintenance_complete":
            # Batch maintenance complete
            for truck_id in truck_ids:
                truck = next((t for t in simulation_service.trucks if t.id == truck_id), None)
                if truck and truck.status == TruckStatus.MAINTENANCE:
                    truck.complete_maintenance()
                    results.append(f"Completed maintenance for {truck_id}")
        
        elif operation == "clear_routes":
            # Batch route clearing
            for truck_id in truck_ids:
                truck = next((t for t in simulation_service.trucks if t.id == truck_id), None)
                if truck:
                    truck.assign_route([])
                    results.append(f"Cleared route for {truck_id}")
        
        elif operation == "set_offline":
            # Batch offline
            offline_status = data.get("offline", True)
            for truck_id in truck_ids:
                truck = next((t for t in simulation_service.trucks if t.id == truck_id), None)
                if truck:
                    truck.set_offline(offline_status)
                    status = "offline" if offline_status else "online"
                    results.append(f"Set {truck_id} {status}")
        
        else:
            return jsonify({"success": False, "error": f"Unknown operation: {operation}"}), 400
        
        return jsonify({
            "success": True,
            "message": f"Batch operation '{operation}' completed",
            "results": results,
            "processed_trucks": len(results)
        })
        
    except Exception as e:
        logger.error(f"Failed to perform batch operation: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/<truck_id>/simulate_breakdown", methods=["POST"])
def simulate_breakdown(truck_id: str):
    """Simulate truck breakdown for testing"""
    try:
        truck = next((t for t in simulation_service.trucks if t.id == truck_id), None)
        
        if not truck:
            return jsonify({"success": False, "error": "Truck not found"}), 404
        
        if truck.status == TruckStatus.MAINTENANCE:
            return jsonify({
                "success": False, 
                "error": "Truck already in maintenance"
            }), 400
        
        # Simulate breakdown
        truck.perform_maintenance()
        
        # Log the event
        from datetime import datetime
        simulation_service._log_event("truck_breakdown_simulated", {
            "truck_id": truck_id,
            "location": list(truck.location),
            "timestamp": datetime.now().isoformat()
        })
        
        return jsonify({
            "success": True,
            "message": f"Simulated breakdown for truck {truck_id}",
            "truck": truck.as_dict()
        })
        
    except Exception as e:
        logger.error(f"Failed to simulate breakdown for truck {truck_id}: {e}")
        return jsonify({"success": False, "error": str(e)}), 500