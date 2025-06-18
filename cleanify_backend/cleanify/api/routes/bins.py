"""
CRUD + manual-collect operations for bins.
Keep route functions thin - delegate to services.
"""
from flask import Blueprint, request, jsonify, current_app
from typing import Dict, Any, List
import logging
from werkzeug.local import LocalProxy

simulation_service = LocalProxy(lambda: current_app.simulation_service)
from cleanify.core.models.bin import Bin, WasteType, BinStatus

bp = Blueprint("bins", __name__)
logger = logging.getLogger(__name__)


@bp.route("/", methods=["GET"])
def get_bins():
    """Get all bins with optional filtering"""
    try:
        # Get query parameters
        status_filter = request.args.get("status")
        type_filter = request.args.get("type")
        needs_collection = request.args.get("needs_collection", "").lower() == "true"
        limit = request.args.get("limit", type=int)
        
        bins = simulation_service.bins
        
        # Apply filters
        if status_filter:
            bins = [b for b in bins if b.status.value == status_filter]
        
        if type_filter:
            bins = [b for b in bins if b.type.value == type_filter]
        
        if needs_collection:
            bins = [
                b for b in bins 
                if b.needs_collection(simulation_service.threshold_service.threshold_for(b))
            ]
        
        # Apply limit
        if limit:
            bins = bins[:limit]
        
        # Convert to dict format
        bins_data = [bin_obj.as_dict() for bin_obj in bins]
        
        return jsonify({
            "success": True,
            "bins": bins_data,
            "total": len(bins_data),
            "filters_applied": {
                "status": status_filter,
                "type": type_filter,
                "needs_collection": needs_collection,
                "limit": limit
            }
        })
        
    except Exception as e:
        logger.error(f"Failed to get bins: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/<bin_id>", methods=["GET"])
def get_bin(bin_id: str):
    """Get specific bin by ID"""
    try:
        bin_obj = next((b for b in simulation_service.bins if b.id == bin_id), None)
        
        if not bin_obj:
            return jsonify({"success": False, "error": "Bin not found"}), 404
        
        # Get additional info
        threshold = simulation_service.threshold_service.threshold_for(bin_obj)
        
        bin_data = bin_obj.as_dict()
        bin_data["current_threshold"] = threshold
        bin_data["threshold_analysis"] = simulation_service.threshold_service.analyze_threshold_factors(bin_obj)
        
        return jsonify({
            "success": True,
            "bin": bin_data
        })
        
    except Exception as e:
        logger.error(f"Failed to get bin {bin_id}: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/", methods=["POST"])
def create_bin():
    """Create new bin"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        # Validate required fields
        required_fields = ["id", "type", "location", "static_threshold"]
        for field in required_fields:
            if field not in data:
                return jsonify({"success": False, "error": f"Missing field: {field}"}), 400
        
        # Validate waste type
        try:
            waste_type = WasteType(data["type"])
        except ValueError:
            return jsonify({
                "success": False, 
                "error": f"Invalid waste type. Must be one of: {[wt.value for wt in WasteType]}"
            }), 400
        
        # Check if bin ID already exists
        if any(b.id == data["id"] for b in simulation_service.bins):
            return jsonify({"success": False, "error": "Bin ID already exists"}), 400
        
        # Validate location
        if not isinstance(data["location"], list) or len(data["location"]) != 2:
            return jsonify({"success": False, "error": "Location must be [longitude, latitude]"}), 400
        
        # Create bin
        bin_data = {
            "id": data["id"],
            "type": data["type"],
            "location": data["location"],
            "fill_level": data.get("fill_level", 0.0),
            "static_threshold": data["static_threshold"],
            "capacity": data.get("capacity", 100.0),
            "fill_rate": data.get("fill_rate", 10.0),
            "priority": data.get("priority", 1)
        }
        
        success = simulation_service.add_bin(bin_data)
        
        if success:
            return jsonify({"success": True, "message": "Bin created successfully"}), 201
        else:
            return jsonify({"success": False, "error": "Failed to create bin"}), 500
            
    except Exception as e:
        logger.error(f"Failed to create bin: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/<bin_id>", methods=["PUT"])
def update_bin(bin_id: str):
    """Update existing bin"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        bin_obj = next((b for b in simulation_service.bins if b.id == bin_id), None)
        
        if not bin_obj:
            return jsonify({"success": False, "error": "Bin not found"}), 404
        
        # Update fields
        if "fill_level" in data:
            if not (0 <= data["fill_level"] <= 100):
                return jsonify({"success": False, "error": "Fill level must be 0-100"}), 400
            bin_obj.fill_level = data["fill_level"]
        
        if "static_threshold" in data:
            if not (0 <= data["static_threshold"] <= 100):
                return jsonify({"success": False, "error": "Threshold must be 0-100"}), 400
            bin_obj.static_threshold = data["static_threshold"]
        
        if "capacity" in data:
            if data["capacity"] <= 0:
                return jsonify({"success": False, "error": "Capacity must be positive"}), 400
            bin_obj.capacity = data["capacity"]
        
        if "fill_rate" in data:
            if data["fill_rate"] < 0:
                return jsonify({"success": False, "error": "Fill rate cannot be negative"}), 400
            bin_obj.fill_rate = data["fill_rate"]
        
        if "priority" in data:
            if data["priority"] not in [1, 2, 3]:
                return jsonify({"success": False, "error": "Priority must be 1, 2, or 3"}), 400
            bin_obj.priority = data["priority"]
        
        if "status" in data:
            try:
                new_status = BinStatus(data["status"])
                bin_obj.status = new_status
            except ValueError:
                return jsonify({
                    "success": False, 
                    "error": f"Invalid status. Must be one of: {[s.value for s in BinStatus]}"
                }), 400
        
        if "type" in data:
            try:
                new_type = WasteType(data["type"])
                bin_obj.type = new_type
            except ValueError:
                return jsonify({
                    "success": False, 
                    "error": f"Invalid type. Must be one of: {[t.value for t in WasteType]}"
                }), 400
        
        # Update timestamp
        from datetime import datetime
        bin_obj.updated_at = datetime.now()
        
        return jsonify({
            "success": True,
            "message": "Bin updated successfully",
            "bin": bin_obj.as_dict()
        })
        
    except Exception as e:
        logger.error(f"Failed to update bin {bin_id}: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/<bin_id>", methods=["DELETE"])
def delete_bin(bin_id: str):
    """Delete bin"""
    try:
        success = simulation_service.remove_bin(bin_id)
        
        if success:
            return jsonify({"success": True, "message": "Bin deleted successfully"})
        else:
            return jsonify({"success": False, "error": "Bin not found"}), 404
            
    except Exception as e:
        logger.error(f"Failed to delete bin {bin_id}: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/<bin_id>/collect", methods=["POST"])
def collect_bin(bin_id: str):
    """Manually trigger collection of specific bin"""
    try:
        bin_obj = next((b for b in simulation_service.bins if b.id == bin_id), None)
        
        if not bin_obj:
            return jsonify({"success": False, "error": "Bin not found"}), 404
        
        if bin_obj.status != BinStatus.ACTIVE:
            return jsonify({
                "success": False, 
                "error": f"Cannot collect bin with status: {bin_obj.status.value}"
            }), 400
        
        # Find available truck
        available_truck = None
        for truck in simulation_service.trucks:
            if truck.is_available():
                bin_load = (bin_obj.fill_level / 100.0) * bin_obj.capacity
                if truck.can_collect_bin(bin_load):
                    available_truck = truck
                    break
        
        if not available_truck:
            return jsonify({
                "success": False, 
                "error": "No available truck with sufficient capacity"
            }), 400
        
        # Assign collection task
        available_truck.assign_route([bin_id])
        
        return jsonify({
            "success": True,
            "message": f"Collection assigned to truck {available_truck.id}",
            "truck_id": available_truck.id,
            "bin_id": bin_id
        })
        
    except Exception as e:
        logger.error(f"Failed to collect bin {bin_id}: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/collect/urgent", methods=["POST"])
def collect_urgent_bins():
    """Collect all bins above their thresholds"""
    try:
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
        
        # Trigger optimization for urgent bins
        result = simulation_service.optimization_svc.full_reoptimize(
            simulation_service.trucks, urgent_bins
        )
        
        return jsonify({
            "success": True,
            "message": f"Collection optimized for {len(urgent_bins)} urgent bins",
            "urgent_bins": len(urgent_bins),
            "optimization_result": result
        })
        
    except Exception as e:
        logger.error(f"Failed to collect urgent bins: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/collect/all", methods=["POST"])
def collect_all_bins():
    """Collect all active bins regardless of fill level"""
    try:
        active_bins = [b for b in simulation_service.bins if b.status == BinStatus.ACTIVE]
        
        if not active_bins:
            return jsonify({
                "success": True,
                "message": "No active bins to collect",
                "bins_count": 0
            })
        
        # Trigger optimization for all active bins
        result = simulation_service.optimization_svc.collect_all(
            simulation_service.trucks, active_bins
        )
        
        return jsonify({
            "success": True,
            "message": f"Collection optimized for {len(active_bins)} bins",
            "bins_count": len(active_bins),
            "optimization_result": result
        })
        
    except Exception as e:
        logger.error(f"Failed to collect all bins: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/statistics", methods=["GET"])
def get_bin_statistics():
    """Get bin statistics and analytics"""
    try:
        bins = simulation_service.bins
        
        # Basic counts
        total_bins = len(bins)
        active_bins = len([b for b in bins if b.status == BinStatus.ACTIVE])
        full_bins = len([b for b in bins if b.status == BinStatus.FULL])
        maintenance_bins = len([b for b in bins if b.status == BinStatus.MAINTENANCE])
        
        # Fill level statistics
        fill_levels = [b.fill_level for b in bins if b.status == BinStatus.ACTIVE]
        avg_fill_level = sum(fill_levels) / len(fill_levels) if fill_levels else 0
        
        # Type distribution
        type_counts = {}
        for waste_type in WasteType:
            type_counts[waste_type.value] = len([b for b in bins if b.type == waste_type])
        
        # Bins needing collection
        urgent_bins = []
        for bin_obj in bins:
            if bin_obj.status == BinStatus.ACTIVE:
                threshold = simulation_service.threshold_service.threshold_for(bin_obj)
                if bin_obj.fill_level >= threshold:
                    urgent_bins.append(bin_obj.id)
        
        # Priority distribution
        priority_counts = {1: 0, 2: 0, 3: 0}
        for bin_obj in bins:
            if hasattr(bin_obj, 'priority'):
                priority_counts[bin_obj.priority] = priority_counts.get(bin_obj.priority, 0) + 1
        
        return jsonify({
            "success": True,
            "statistics": {
                "total_bins": total_bins,
                "active_bins": active_bins,
                "full_bins": full_bins,
                "maintenance_bins": maintenance_bins,
                "average_fill_level": round(avg_fill_level, 2),
                "bins_needing_collection": len(urgent_bins),
                "urgent_bin_ids": urgent_bins,
                "type_distribution": type_counts,
                "priority_distribution": priority_counts,
                "collection_efficiency": (
                    (total_bins - len(urgent_bins)) / max(1, total_bins) * 100
                ) if total_bins > 0 else 100
            }
        })
        
    except Exception as e:
        logger.error(f"Failed to get bin statistics: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/<bin_id>/maintenance", methods=["POST"])
def set_bin_maintenance(bin_id: str):
    """Set or remove bin maintenance status"""
    try:
        data = request.get_json() or {}
        maintenance = data.get("maintenance", True)
        
        bin_obj = next((b for b in simulation_service.bins if b.id == bin_id), None)
        
        if not bin_obj:
            return jsonify({"success": False, "error": "Bin not found"}), 404
        
        bin_obj.set_maintenance(maintenance)
        
        action = "enabled" if maintenance else "disabled"
        return jsonify({
            "success": True,
            "message": f"Maintenance {action} for bin {bin_id}",
            "bin": bin_obj.as_dict()
        })
        
    except Exception as e:
        logger.error(f"Failed to set maintenance for bin {bin_id}: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/batch", methods=["POST"])
def batch_operations():
    """Perform batch operations on multiple bins"""
    try:
        data = request.get_json()
        
        if not data or "operation" not in data:
            return jsonify({"success": False, "error": "Operation not specified"}), 400
        
        operation = data["operation"]
        bin_ids = data.get("bin_ids", [])
        
        if not bin_ids:
            return jsonify({"success": False, "error": "No bin IDs provided"}), 400
        
        results = []
        
        if operation == "collect":
            # Batch collection
            bins_to_collect = []
            for bin_id in bin_ids:
                bin_obj = next((b for b in simulation_service.bins if b.id == bin_id), None)
                if bin_obj and bin_obj.status == BinStatus.ACTIVE:
                    bins_to_collect.append(bin_obj)
            
            if bins_to_collect:
                result = simulation_service.optimization_svc.full_reoptimize(
                    simulation_service.trucks, bins_to_collect
                )
                results.append(f"Optimized collection for {len(bins_to_collect)} bins")
            
        elif operation == "maintenance":
            # Batch maintenance
            maintenance_status = data.get("maintenance", True)
            for bin_id in bin_ids:
                bin_obj = next((b for b in simulation_service.bins if b.id == bin_id), None)
                if bin_obj:
                    bin_obj.set_maintenance(maintenance_status)
                    results.append(f"Set maintenance for {bin_id}")
        
        elif operation == "update_threshold":
            # Batch threshold update
            new_threshold = data.get("threshold")
            if new_threshold is None or not (0 <= new_threshold <= 100):
                return jsonify({"success": False, "error": "Invalid threshold value"}), 400
            
            for bin_id in bin_ids:
                bin_obj = next((b for b in simulation_service.bins if b.id == bin_id), None)
                if bin_obj:
                    bin_obj.static_threshold = new_threshold
                    results.append(f"Updated threshold for {bin_id}")
        
        else:
            return jsonify({"success": False, "error": f"Unknown operation: {operation}"}), 400
        
        return jsonify({
            "success": True,
            "message": f"Batch operation '{operation}' completed",
            "results": results,
            "processed_bins": len(results)
        })
        
    except Exception as e:
        logger.error(f"Failed to perform batch operation: {e}")
        return jsonify({"success": False, "error": str(e)}), 500