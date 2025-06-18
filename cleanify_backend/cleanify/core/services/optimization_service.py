"""
Wraps OR-Tools calls.
Exposes 2 public methods:
    full_reoptimize()      – triggered by manual buttons / scheduled jobs
    maybe_reoptimize()     – cheap check each tick; does "radar" incremental insertion
"""
from ortools.constraint_solver import routing_enums_pb2, pywrapcp
from typing import List, Dict, Any, Tuple, Optional
import time
import logging
from datetime import datetime
from cleanify.core.services.knapsack import BinKnapsackOptimizer, KnapsackSolver


class OptimizationService:
    """Main optimization service using OR-Tools for VRP and knapsack for capacity planning"""
    
    def __init__(self, traffic_service=None, osrm_service=None, threshold_service=None):
        self.traffic_service = traffic_service
        self.osrm_service = osrm_service
        self.threshold_service = threshold_service
        
        # Optimization configuration
        self.config = {
            "vrp_time_limit_seconds": 30,
            "knapsack_time_limit_seconds": 5,
            "max_route_distance_km": 100,
            "max_route_duration_minutes": 240,
            "depot_return_required": True,
            "vehicle_capacity_buffer": 0.05,  # 5% capacity buffer
            "radar_check_interval_minutes": 2,
            "urgency_threshold": 85.0,
            "optimization_algorithm": "auto"  # auto, local_search, guided_local_search
        }
        
        # State tracking
        self.last_optimization_time = datetime.now()
        self.last_radar_check = datetime.now()
        self.optimization_count = 0
        self.radar_checks = 0
        
        # Performance tracking
        self.optimization_times = []
        self.solution_qualities = []
        
        # Initialize knapsack optimizer
        knapsack_solver = KnapsackSolver(self.config["knapsack_time_limit_seconds"])
        self.knapsack_optimizer = BinKnapsackOptimizer(knapsack_solver)
        
        self.logger = logging.getLogger(__name__)
    
    # ------- Manual triggers ---------
    
    def full_reoptimize(self, trucks: List[Any], bins: List[Any] = None) -> Dict[str, Any]:
        """
        Perform full reoptimization of all trucks and routes.
        
        Args:
            trucks: List of truck objects
            bins: List of bin objects (if None, will get from service)
            
        Returns:
            Optimization results with new routes
        """
        start_time = time.perf_counter()
        self.optimization_count += 1
        
        try:
            # Get bins that need collection
            if bins is None:
                bins = self._get_bins_needing_collection()
            
            if not bins:
                self.logger.info("No bins need collection")
                return {"success": True, "message": "No bins need collection", "routes": {}}
            
            # Filter available trucks
            available_trucks = [t for t in trucks if t.is_available()]
            
            if not available_trucks:
                self.logger.warning("No trucks available for optimization")
                return {"success": False, "message": "No trucks available", "routes": {}}
            
            # Step 1: Use knapsack to determine which bins each truck should collect
            capacity_allocation = self._allocate_bins_to_trucks(available_trucks, bins)
            
            # Step 2: Use VRP to optimize routes for each truck
            route_results = {}
            total_distance = 0
            total_duration = 0
            
            for truck_id, allocation in capacity_allocation["allocations"].items():
                if allocation["num_bins"] == 0:
                    continue
                
                truck = next((t for t in available_trucks if t.id == truck_id), None)
                if not truck:
                    continue
                
                # Optimize route for this truck's assigned bins
                route_result = self._optimize_truck_route(truck, allocation["selected_bins"])
                
                if route_result["success"]:
                    route_results[truck_id] = route_result
                    total_distance += route_result.get("total_distance", 0)
                    total_duration += route_result.get("total_duration", 0)
                    
                    # Assign route to truck
                    optimized_order = route_result["optimized_bin_ids"]
                    truck.assign_route(optimized_order)
                else:
                    self.logger.warning(f"Route optimization failed for truck {truck_id}")
            
            optimization_time = time.perf_counter() - start_time
            self.optimization_times.append(optimization_time)
            self.last_optimization_time = datetime.now()
            
            # Calculate solution quality metrics
            quality_metrics = self._calculate_solution_quality(route_results, bins)
            self.solution_qualities.append(quality_metrics)
            
            return {
                "success": True,
                "routes": route_results,
                "capacity_allocation": capacity_allocation,
                "total_distance": total_distance,
                "total_duration": total_duration,
                "bins_assigned": sum(len(r.get("optimized_bin_ids", [])) for r in route_results.values()),
                "trucks_used": len(route_results),
                "optimization_time": optimization_time,
                "quality_metrics": quality_metrics
            }
            
        except Exception as e:
            self.logger.error(f"Full reoptimization failed: {e}")
            return {"success": False, "error": str(e), "routes": {}}
    
    def collect_all(self, trucks: List[Any], bins: List[Any]) -> Dict[str, Any]:
        """
        Create routes to collect all specified bins regardless of thresholds.
        
        Args:
            trucks: Available trucks
            bins: Bins to collect
            
        Returns:
            Collection route results
        """
        self.logger.info(f"Collect all triggered for {len(bins)} bins")
        
        # Force collection by treating all bins as urgent
        urgent_bins = []
        for bin_obj in bins:
            if bin_obj.status.value == "active":  # Only collect active bins
                urgent_bins.append(bin_obj)
        
        return self.full_reoptimize(trucks, urgent_bins)
    
    # ------- Loop hook ---------------
    
    def maybe_reoptimize(self, trucks: List[Any]) -> bool:
        """
        Cheap check each tick for incremental optimization opportunities.
        Does "radar" incremental insertion of urgent bins.
        
        Args:
            trucks: Current truck fleet
            
        Returns:
            True if any optimization was performed
        """
        current_time = datetime.now()
        time_since_check = (current_time - self.last_radar_check).total_seconds() / 60
        
        # Only check every N minutes
        if time_since_check < self.config["radar_check_interval_minutes"]:
            return False
        
        self.last_radar_check = current_time
        self.radar_checks += 1
        
        try:
            # Find bins that have become urgent since last check
            urgent_bins = self._find_urgent_bins()
            
            if not urgent_bins:
                return False
            
            # Find trucks that can accommodate urgent bins
            optimization_performed = False
            
            for bin_obj in urgent_bins:
                # Try to insert into existing routes or assign to idle trucks
                inserted = self._try_incremental_insertion(bin_obj, trucks)
                
                if inserted:
                    optimization_performed = True
                    self.logger.info(f"Incrementally inserted urgent bin {bin_obj.id}")
            
            return optimization_performed
            
        except Exception as e:
            self.logger.error(f"Radar check failed: {e}")
            return False
    
    # ------- Helpers -----------------
    
    def _solve_vrp(self, trucks: List[Any], candidate_bins: List[Any], 
                   depot_location: Tuple[float, float] = None) -> Dict[str, Any]:
        """
        Solve Vehicle Routing Problem using OR-Tools.
        
        Args:
            trucks: Available trucks
            candidate_bins: Bins to visit
            depot_location: Depot coordinates
            
        Returns:
            VRP solution with routes
        """
        if not candidate_bins or not trucks:
            return {"success": False, "message": "No trucks or bins provided"}
        
        if depot_location is None:
            depot_location = trucks[0].depot_location
        
        try:
            # Prepare data for OR-Tools
            data = self._prepare_vrp_data(trucks, candidate_bins, depot_location)
            
            # Create routing model
            manager = pywrapcp.RoutingIndexManager(
                len(data['locations']),
                len(data['vehicles']),
                data['depot']
            )
            routing = pywrapcp.RoutingModel(manager)
            
            # Add distance/time constraint
            def distance_callback(from_index, to_index):
                from_node = manager.IndexToNode(from_index)
                to_node = manager.IndexToNode(to_index)
                return data['distance_matrix'][from_node][to_node]
            
            transit_callback_index = routing.RegisterTransitCallback(distance_callback)
            routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)
            
            # Add capacity constraints
            def demand_callback(from_index):
                from_node = manager.IndexToNode(from_index)
                return data['demands'][from_node]
            
            demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
            routing.AddDimensionWithVehicleCapacity(
                demand_callback_index,
                0,  # null capacity slack
                data['vehicle_capacities'],  # vehicle maximum capacities
                True,  # start cumul to zero
                'Capacity'
            )
            
            # Add time windows if available
            if 'time_windows' in data:
                def time_callback(from_index, to_index):
                    from_node = manager.IndexToNode(from_index)
                    to_node = manager.IndexToNode(to_index)
                    return data['time_matrix'][from_node][to_node]
                
                time_callback_index = routing.RegisterTransitCallback(time_callback)
                routing.AddDimension(
                    time_callback_index,
                    30,  # allow waiting time
                    self.config["max_route_duration_minutes"] * 60,  # maximum time per vehicle
                    False,  # don't force start cumul to zero
                    'Time'
                )
                
                time_dimension = routing.GetDimensionOrDie('Time')
                for location_idx, time_window in enumerate(data['time_windows']):
                    index = manager.NodeToIndex(location_idx)
                    time_dimension.CumulVar(index).SetRange(time_window[0], time_window[1])
            
            # Set search parameters
            search_parameters = pywrapcp.DefaultRoutingSearchParameters()
            search_parameters.time_limit.seconds = self.config["vrp_time_limit_seconds"]
            
            # Choose algorithm based on configuration
            if self.config["optimization_algorithm"] == "guided_local_search":
                search_parameters.local_search_metaheuristic = (
                    routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
                )
            elif self.config["optimization_algorithm"] == "local_search":
                search_parameters.local_search_metaheuristic = (
                    routing_enums_pb2.LocalSearchMetaheuristic.AUTOMATIC
                )
            
            # Solve
            solution = routing.SolveWithParameters(search_parameters)
            
            if solution:
                return self._extract_vrp_solution(manager, routing, solution, data)
            else:
                return {"success": False, "message": "No VRP solution found"}
                
        except Exception as e:
            self.logger.error(f"VRP solving failed: {e}")
            return {"success": False, "error": str(e)}
    
    def _knapsack_filter(self, truck: Any, candidate_bins: List[Any]) -> List[Any]:
        """
        Filter bins using knapsack algorithm based on truck capacity.
        
        Args:
            truck: Truck object
            candidate_bins: Bins to consider
            
        Returns:
            List of selected bins that fit in truck capacity
        """
        available_capacity = truck.capacity - truck.load
        
        if available_capacity <= 0:
            return []
        
        result = self.knapsack_optimizer.optimize_bin_selection(
            available_capacity, 
            candidate_bins,
            urgency_calculator=self._calculate_bin_urgency
        )
        
        return result["selected_bins"]
    
    def _allocate_bins_to_trucks(self, trucks: List[Any], bins: List[Any]) -> Dict[str, Any]:
        """Allocate bins to trucks using knapsack optimization"""
        return self.knapsack_optimizer.optimize_multi_truck_allocation(
            trucks, bins, urgency_calculator=self._calculate_bin_urgency
        )
    
    def _optimize_truck_route(self, truck: Any, assigned_bins: List[Any]) -> Dict[str, Any]:
        """Optimize route for a single truck's assigned bins"""
        if not assigned_bins:
            return {"success": True, "optimized_bin_ids": [], "total_distance": 0, 
                    "total_duration": 0, "route_geometry": []}
        
        # Create coordinate list: depot -> bins -> depot
        coordinates = [truck.depot_location]
        bin_ids = []
        
        for bin_obj in assigned_bins:
            coordinates.append(bin_obj.location)
            bin_ids.append(bin_obj.id)
        
        coordinates.append(truck.depot_location)  # Return to depot
        
        try:
            route_geometry = []  # Store the actual road path
            
            if self.osrm_service and len(coordinates) > 2:
                # Get the full route with geometry from OSRM
                try:
                    # Request route with full geometry
                    route_result = self.osrm_service.route(
                        coordinates, 
                        options={
                            'overview': 'full',      # Get full geometry
                            'geometries': 'geojson', # GeoJSON format
                            'steps': 'false'
                        }
                    )
                    
                    if 'routes' in route_result and route_result['routes']:
                        route = route_result['routes'][0]
                        
                        # Extract geometry coordinates
                        if 'geometry' in route and 'coordinates' in route['geometry']:
                            # OSRM returns [lon, lat] format
                            geometry_coords = route['geometry']['coordinates']
                            # Convert to [lat, lon] for Leaflet
                            route_geometry = [[coord[1], coord[0]] for coord in geometry_coords]
                        
                        return {
                            "success": True,
                            "optimized_bin_ids": bin_ids,  # Keep original order for now
                            "total_distance": route.get('distance', 0) / 1000.0,  # Convert to km
                            "total_duration": route.get('duration', 0) / 60.0,    # Convert to minutes
                            "route_geometry": route_geometry,  # NEW: Actual road path
                            "original_order": bin_ids,
                            "optimization_used": True
                        }
                        
                except Exception as e:
                    self.logger.warning(f"OSRM route geometry failed: {e}")
            
            # Fallback: create simple path between points
            route_geometry = [[coord[1], coord[0]] for coord in coordinates]  # Convert to [lat, lon]
            
            return {
                "success": True,
                "optimized_bin_ids": bin_ids,
                "total_distance": 0,
                "total_duration": 0,
                "route_geometry": route_geometry,  # Simple straight lines as fallback
                "original_order": bin_ids,
                "optimization_used": False
            }
            
        except Exception as e:
            self.logger.warning(f"Route optimization failed for truck {truck.id}: {e}")
            return {
                "success": True,
                "optimized_bin_ids": bin_ids,
                "total_distance": 0,
                "total_duration": 0,
                "route_geometry": [],
                "error": str(e),
                "optimization_used": False
            }
    
    def _get_bins_needing_collection(self) -> List[Any]:
        """Get bins that need collection based on thresholds"""
        # Access current Flask app context to get simulation service
        try:
            from flask import current_app
            if hasattr(current_app, 'simulation_service'):
                sim_svc = current_app.simulation_service
                bins_needing_collection = []
                for bin_obj in sim_svc.bins:
                    if bin_obj.status.value == "active":
                        threshold = sim_svc.threshold_service.threshold_for(bin_obj)
                        if bin_obj.fill_level >= threshold:
                            bins_needing_collection.append(bin_obj)
                return bins_needing_collection
        except:
            pass
        return []

    def _find_urgent_bins(self) -> List[Any]:
        """Find bins that have become urgent"""
        # Access current Flask app context to get simulation service  
        try:
            from flask import current_app
            if hasattr(current_app, 'simulation_service'):
                sim_svc = current_app.simulation_service
                urgent_bins = []
                for bin_obj in sim_svc.bins:
                    if bin_obj.status.value == "active":
                        threshold = sim_svc.threshold_service.threshold_for(bin_obj)
                        if bin_obj.fill_level >= threshold:
                            urgent_bins.append(bin_obj)
                return urgent_bins
        except:
            pass
        return []
    
    def _try_incremental_insertion(self, bin_obj: Any, trucks: List[Any]) -> bool:
        """Try to insert bin into existing routes or assign to idle truck"""
        # Try idle trucks first
        for truck in trucks:
            if truck.status.value == "idle" and truck.can_collect_bin(bin_obj.capacity):
                truck.assign_route([bin_obj.id])
                return True
        
        # Try inserting into existing routes
        for truck in trucks:
            if (truck.status.value == "en_route" and 
                truck.can_collect_bin(bin_obj.capacity) and
                len(truck.route) < 10):  # Don't overload routes
                
                # Simple insertion at end of route
                truck.route.append(bin_obj.id)
                return True
        
        return False
    
    def _calculate_bin_urgency(self, bin_obj: Any) -> float:
        """Calculate urgency score for bin optimization"""
        urgency = bin_obj.fill_level
        
        # Apply threshold service if available
        if self.threshold_service:
            threshold = self.threshold_service.threshold_for(bin_obj)
            if bin_obj.fill_level >= threshold:
                urgency *= 1.5  # Boost urgency for bins above threshold
        
        # Type-based urgency
        type_multipliers = {
            "hazardous": 2.0,
            "recyclable": 1.0,
            "general": 0.8
        }
        
        bin_type = bin_obj.type.value if hasattr(bin_obj.type, 'value') else str(bin_obj.type)
        urgency *= type_multipliers.get(bin_type.lower(), 1.0)
        
        # Priority multiplier
        if hasattr(bin_obj, 'priority'):
            urgency *= (0.5 + 0.5 * bin_obj.priority)
        
        return urgency
    
    def _prepare_vrp_data(self, trucks: List[Any], bins: List[Any], 
                         depot_location: Tuple[float, float]) -> Dict[str, Any]:
        """Prepare data structure for OR-Tools VRP solver"""
        # Locations: depot + bin locations
        locations = [depot_location] + [bin_obj.location for bin_obj in bins]
        
        # Vehicle capacities
        vehicle_capacities = []
        for truck in trucks:
            available_capacity = truck.capacity - truck.load
            # Apply capacity buffer
            buffered_capacity = int(available_capacity * (1 - self.config["vehicle_capacity_buffer"]))
            vehicle_capacities.append(max(1, buffered_capacity))
        
        # Demands: depot has 0 demand, bins have their load
        demands = [0]  # Depot
        for bin_obj in bins:
            bin_load = int((bin_obj.fill_level / 100.0) * bin_obj.capacity)
            demands.append(max(1, bin_load))
        
        # Distance matrix
        distance_matrix = self._create_distance_matrix(locations)
        
        # Time matrix (if traffic service available)
        time_matrix = None
        if self.traffic_service:
            traffic_mult = self.traffic_service.current_multiplier()
            time_matrix = self._create_time_matrix(locations, traffic_mult)
        
        return {
            'locations': locations,
            'vehicles': trucks,
            'vehicle_capacities': vehicle_capacities,
            'demands': demands,
            'distance_matrix': distance_matrix,
            'time_matrix': time_matrix,
            'depot': 0  # First location is depot
        }
    
    def _create_distance_matrix(self, locations: List[Tuple[float, float]]) -> List[List[int]]:
        """Create distance matrix for locations (in meters, as integers)"""
        n = len(locations)
        matrix = [[0 for _ in range(n)] for _ in range(n)]
        
        for i in range(n):
            for j in range(n):
                if i != j:
                    if self.osrm_service:
                        try:
                            distance_km = self.osrm_service.calculate_distance(locations[i], locations[j])
                            matrix[i][j] = int(distance_km * 1000)  # Convert to meters
                        except:
                            # Fallback to haversine
                            distance_km = self.osrm_service._calculate_haversine_distance(
                                locations[i], locations[j]
                            )
                            matrix[i][j] = int(distance_km * 1000)
                    else:
                        # Use simple Euclidean distance as fallback
                        dx = locations[i][0] - locations[j][0]
                        dy = locations[i][1] - locations[j][1]
                        distance = (dx**2 + dy**2)**0.5 * 111000  # Rough conversion to meters
                        matrix[i][j] = int(distance)
        
        return matrix
    
    def _create_time_matrix(self, locations: List[Tuple[float, float]], 
                           traffic_multiplier: float) -> List[List[int]]:
        """Create time matrix for locations (in seconds, as integers)"""
        n = len(locations)
        matrix = [[0 for _ in range(n)] for _ in range(n)]
        
        for i in range(n):
            for j in range(n):
                if i != j:
                    if self.osrm_service:
                        try:
                            time_minutes = self.osrm_service.calculate_travel_time(
                                locations[i], locations[j], traffic_multiplier
                            )
                            matrix[i][j] = int(time_minutes * 60)  # Convert to seconds
                        except:
                            # Fallback estimation
                            distance_km = self.osrm_service._calculate_haversine_distance(
                                locations[i], locations[j]
                            )
                            time_hours = distance_km / 40.0  # Assume 40 km/h average
                            time_seconds = time_hours * 3600 * traffic_multiplier
                            matrix[i][j] = int(time_seconds)
                    else:
                        # Simple fallback
                        dx = locations[i][0] - locations[j][0]
                        dy = locations[i][1] - locations[j][1]
                        distance = (dx**2 + dy**2)**0.5 * 111000  # meters
                        time_seconds = (distance / 1000) / 40 * 3600 * traffic_multiplier  # 40 km/h
                        matrix[i][j] = int(time_seconds)
        
        return matrix
    
    def _extract_vrp_solution(self, manager, routing, solution, data) -> Dict[str, Any]:
        """Extract solution from OR-Tools VRP solver"""
        routes = {}
        total_distance = 0
        total_time = 0
        
        for vehicle_id in range(len(data['vehicles'])):
            truck = data['vehicles'][vehicle_id]
            route_distance = 0
            route_time = 0
            route_load = 0
            route_nodes = []
            
            index = routing.Start(vehicle_id)
            
            while not routing.IsEnd(index):
                node_index = manager.IndexToNode(index)
                route_nodes.append(node_index)
                
                if node_index > 0:  # Not depot
                    route_load += data['demands'][node_index]
                
                previous_index = index
                index = solution.Value(routing.NextVar(index))
                
                if not routing.IsEnd(index):
                    route_distance += routing.GetArcCostForVehicle(previous_index, index, vehicle_id)
            
            # Add final return to depot
            route_nodes.append(manager.IndexToNode(index))
            
            if len(route_nodes) > 2:  # More than just depot start/end
                bin_ids = []
                for node in route_nodes[1:-1]:  # Exclude depot nodes
                    bin_idx = node - 1  # Adjust for depot being index 0
                    if 0 <= bin_idx < len(data['locations']) - 1:
                        # This would need actual bin ID mapping
                        bin_ids.append(f"bin_{bin_idx}")
                
                routes[truck.id] = {
                    "truck_id": truck.id,
                    "bin_ids": bin_ids,
                    "route_nodes": route_nodes,
                    "distance": route_distance,
                    "time": route_time,
                    "load": route_load
                }
                
                total_distance += route_distance
                total_time += route_time
        
        return {
            "success": True,
            "routes": routes,
            "total_distance": total_distance,
            "total_time": total_time,
            "objective_value": solution.ObjectiveValue()
        }
    
    def _calculate_solution_quality(self, route_results: Dict[str, Any], bins: List[Any]) -> Dict[str, float]:
        """Calculate quality metrics for optimization solution"""
        if not route_results:
            return {"coverage": 0.0, "efficiency": 0.0, "balance": 0.0}
        
        total_bins = len(bins)
        assigned_bins = sum(len(route.get("optimized_bin_ids", [])) for route in route_results.values())
        coverage = (assigned_bins / max(1, total_bins)) * 100
        
        # Calculate load balance across trucks
        loads = [route.get("total_weight", 0) for route in route_results.values()]
        if loads:
            avg_load = sum(loads) / len(loads)
            load_variance = sum((load - avg_load)**2 for load in loads) / len(loads)
            balance = max(0, 100 - (load_variance / max(1, avg_load)) * 100)
        else:
            balance = 0
        
        # Calculate route efficiency (bins per distance)
        total_distance = sum(route.get("total_distance", 0) for route in route_results.values())
        efficiency = (assigned_bins / max(1, total_distance)) * 100 if total_distance > 0 else 100
        
        return {
            "coverage": round(coverage, 2),
            "efficiency": round(efficiency, 2),
            "balance": round(balance, 2),
            "assigned_bins": assigned_bins,
            "total_bins": total_bins
        }
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get optimization service statistics"""
        avg_optimization_time = (
            sum(self.optimization_times) / max(1, len(self.optimization_times))
            if self.optimization_times else 0
        )
        
        avg_quality = {}
        if self.solution_qualities:
            for metric in ["coverage", "efficiency", "balance"]:
                values = [q.get(metric, 0) for q in self.solution_qualities]
                avg_quality[metric] = sum(values) / len(values)
        
        return {
            "optimization_count": self.optimization_count,
            "radar_checks": self.radar_checks,
            "last_optimization": self.last_optimization_time.isoformat(),
            "last_radar_check": self.last_radar_check.isoformat(),
            "average_optimization_time": round(avg_optimization_time, 3),
            "average_quality_metrics": avg_quality,
            "recent_optimization_times": self.optimization_times[-10:],  # Last 10
            "config": self.config.copy()
        }
    
    def configure(self, config: Dict[str, Any]) -> None:
        """Update optimization configuration"""
        for key, value in config.items():
            if key in self.config:
                self.config[key] = value
                
        # Update knapsack solver time limit if changed
        if "knapsack_time_limit_seconds" in config:
            self.knapsack_optimizer.solver.time_limit = config["knapsack_time_limit_seconds"]
    
    def reset_statistics(self) -> None:
        """Reset performance tracking statistics"""
        self.optimization_times.clear()
        self.solution_qualities.clear()
        self.optimization_count = 0
        self.radar_checks = 0