"""
Knapsack optimization helper for truck capacity planning.
Implements efficient dynamic programming solution for bin selection.
"""
from typing import List, Tuple, Dict, Any, Optional
from dataclasses import dataclass
import time


@dataclass
class KnapsackItem:
    """Represents a bin in the knapsack problem"""
    id: str
    weight: float  # bin load in kg
    value: float   # priority/urgency score
    location: Tuple[float, float]  # for distance calculations
    fill_level: float
    bin_type: str
    
    def value_density(self) -> float:
        """Calculate value per unit weight"""
        return self.value / max(0.01, self.weight)  # Avoid division by zero


class KnapsackSolver:
    """Efficient knapsack solver with multiple algorithms"""
    
    def __init__(self, time_limit_seconds: float = 5.0):
        self.time_limit = time_limit_seconds
        self.last_solve_time = 0.0
        self.last_algorithm_used = ""
    
    def solve(self, capacity: float, items: List[KnapsackItem], 
              algorithm: str = "auto") -> Tuple[List[str], float, float]:
        """
        Solve knapsack problem and return selected item IDs, total value, total weight.
        
        Args:
            capacity: Maximum weight capacity
            items: List of items to consider
            algorithm: "dp", "greedy", "auto" (chooses based on problem size)
            
        Returns:
            (selected_item_ids, total_value, total_weight)
        """
        start_time = time.perf_counter()
        
        if not items or capacity <= 0:
            return [], 0.0, 0.0
        
        # Filter items that are too heavy
        valid_items = [item for item in items if item.weight <= capacity]
        
        if not valid_items:
            return [], 0.0, 0.0
        
        # Choose algorithm
        if algorithm == "auto":
            # Use DP for small problems, greedy for large ones
            algorithm = "dp" if len(valid_items) <= 50 else "greedy"
        
        # Solve using chosen algorithm
        if algorithm == "dp":
            result = self._solve_dp(capacity, valid_items)
        elif algorithm == "greedy":
            result = self._solve_greedy(capacity, valid_items)
        else:
            raise ValueError(f"Unknown algorithm: {algorithm}")
        
        self.last_solve_time = time.perf_counter() - start_time
        self.last_algorithm_used = algorithm
        
        return result
    
    def _solve_dp(self, capacity: float, items: List[KnapsackItem]) -> Tuple[List[str], float, float]:
        """Solve using dynamic programming (optimal but slower)"""
        n = len(items)
        # Convert weights to integers for DP (multiply by 10 for 0.1kg precision)
        weight_multiplier = 10
        int_capacity = int(capacity * weight_multiplier)
        int_weights = [int(item.weight * weight_multiplier) for item in items]
        values = [item.value for item in items]
        
        # DP table: dp[i][w] = max value using first i items with weight <= w
        dp = [[0.0 for _ in range(int_capacity + 1)] for _ in range(n + 1)]
        
        # Fill DP table
        for i in range(1, n + 1):
            for w in range(int_capacity + 1):
                # Don't take item i-1
                dp[i][w] = dp[i-1][w]
                
                # Take item i-1 if it fits
                if int_weights[i-1] <= w:
                    take_value = dp[i-1][w - int_weights[i-1]] + values[i-1]
                    dp[i][w] = max(dp[i][w], take_value)
        
        # Backtrack to find selected items
        selected_ids = []
        total_value = dp[n][int_capacity]
        total_weight = 0.0
        
        w = int_capacity
        for i in range(n, 0, -1):
            if dp[i][w] != dp[i-1][w]:
                # Item i-1 was selected
                selected_ids.append(items[i-1].id)
                total_weight += items[i-1].weight
                w -= int_weights[i-1]
        
        return selected_ids, total_value, total_weight
    
    def _solve_greedy(self, capacity: float, items: List[KnapsackItem]) -> Tuple[List[str], float, float]:
        """Solve using greedy algorithm (fast but approximate)"""
        # Sort items by value density (value per weight)
        sorted_items = sorted(items, key=lambda x: x.value_density(), reverse=True)
        
        selected_ids = []
        total_value = 0.0
        total_weight = 0.0
        
        for item in sorted_items:
            if total_weight + item.weight <= capacity:
                selected_ids.append(item.id)
                total_value += item.value
                total_weight += item.weight
        
        return selected_ids, total_value, total_weight
    
    def solve_multiple_trucks(self, trucks_capacity: List[float], 
                             items: List[KnapsackItem]) -> Dict[int, Tuple[List[str], float, float]]:
        """
        Solve knapsack for multiple trucks.
        
        Args:
            trucks_capacity: List of truck capacities
            items: Available items to distribute
            
        Returns:
            Dict mapping truck_index -> (selected_items, total_value, total_weight)
        """
        results = {}
        remaining_items = items.copy()
        
        # Sort trucks by capacity (largest first for better allocation)
        truck_indices = sorted(range(len(trucks_capacity)), 
                              key=lambda i: trucks_capacity[i], reverse=True)
        
        for truck_idx in truck_indices:
            capacity = trucks_capacity[truck_idx]
            
            if not remaining_items:
                results[truck_idx] = ([], 0.0, 0.0)
                continue
            
            # Solve for this truck
            selected_ids, total_value, total_weight = self.solve(
                capacity, remaining_items, algorithm="greedy"  # Use greedy for speed
            )
            
            results[truck_idx] = (selected_ids, total_value, total_weight)
            
            # Remove selected items from remaining pool
            selected_set = set(selected_ids)
            remaining_items = [item for item in remaining_items if item.id not in selected_set]
        
        return results
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get solver statistics"""
        return {
            "last_solve_time": self.last_solve_time,
            "last_algorithm_used": self.last_algorithm_used,
            "time_limit": self.time_limit
        }


class BinKnapsackOptimizer:
    """High-level optimizer for bin collection using knapsack algorithm"""
    
    def __init__(self, knapsack_solver: KnapsackSolver = None):
        self.solver = knapsack_solver or KnapsackSolver()
    
    def optimize_bin_selection(self, truck_capacity: float, available_bins: List[Any],
                              urgency_calculator=None) -> Dict[str, Any]:
        """
        Optimize bin selection for a single truck.
        
        Args:
            truck_capacity: Available capacity in kg
            available_bins: List of bin objects
            urgency_calculator: Function to calculate bin urgency
            
        Returns:
            Dict with selected bins and optimization info
        """
        # Convert bins to knapsack items
        items = []
        for bin_obj in available_bins:
            # Calculate bin load (estimated weight)
            bin_load = (bin_obj.fill_level / 100.0) * bin_obj.capacity
            
            # Calculate urgency/value
            if urgency_calculator:
                urgency = urgency_calculator(bin_obj)
            else:
                urgency = self._default_urgency_calculator(bin_obj)
            
            items.append(KnapsackItem(
                id=bin_obj.id,
                weight=bin_load,
                value=urgency,
                location=bin_obj.location,
                fill_level=bin_obj.fill_level,
                bin_type=bin_obj.type.value if hasattr(bin_obj.type, 'value') else str(bin_obj.type)
            ))
        
        # Solve knapsack
        selected_ids, total_value, total_weight = self.solver.solve(truck_capacity, items)
        
        # Get selected bins
        selected_bins = [bin_obj for bin_obj in available_bins if bin_obj.id in selected_ids]
        
        return {
            "selected_bins": selected_bins,
            "selected_bin_ids": selected_ids,
            "total_urgency": total_value,
            "total_weight": total_weight,
            "capacity_utilization": (total_weight / truck_capacity) * 100 if truck_capacity > 0 else 0,
            "num_bins": len(selected_bins),
            "algorithm_used": self.solver.last_algorithm_used,
            "solve_time": self.solver.last_solve_time
        }
    
    def optimize_multi_truck_allocation(self, trucks: List[Any], available_bins: List[Any],
                                      urgency_calculator=None) -> Dict[str, Any]:
        """
        Optimize bin allocation across multiple trucks.
        
        Args:
            trucks: List of truck objects
            available_bins: List of available bin objects
            urgency_calculator: Function to calculate bin urgency
            
        Returns:
            Dict with allocation results for each truck
        """
        # Get available capacities
        truck_capacities = []
        truck_ids = []
        
        for truck in trucks:
            available_capacity = truck.capacity - truck.load
            if available_capacity > 0 and truck.is_available():
                truck_capacities.append(available_capacity)
                truck_ids.append(truck.id)
        
        if not truck_capacities:
            return {"allocations": {}, "total_bins_allocated": 0, "total_weight_allocated": 0.0}
        
        # Convert bins to knapsack items
        items = []
        for bin_obj in available_bins:
            bin_load = (bin_obj.fill_level / 100.0) * bin_obj.capacity
            
            if urgency_calculator:
                urgency = urgency_calculator(bin_obj)
            else:
                urgency = self._default_urgency_calculator(bin_obj)
            
            items.append(KnapsackItem(
                id=bin_obj.id,
                weight=bin_load,
                value=urgency,
                location=bin_obj.location,
                fill_level=bin_obj.fill_level,
                bin_type=bin_obj.type.value if hasattr(bin_obj.type, 'value') else str(bin_obj.type)
            ))
        
        # Solve for multiple trucks
        truck_results = self.solver.solve_multiple_trucks(truck_capacities, items)
        
        # Build final allocation results
        allocations = {}
        total_bins = 0
        total_weight = 0.0
        
        for truck_idx, (selected_ids, total_value, total_weight_truck) in truck_results.items():
            truck_id = truck_ids[truck_idx]
            selected_bins = [bin_obj for bin_obj in available_bins if bin_obj.id in selected_ids]
            
            allocations[truck_id] = {
                "truck_id": truck_id,
                "selected_bins": selected_bins,
                "selected_bin_ids": selected_ids,
                "total_urgency": total_value,
                "total_weight": total_weight_truck,
                "capacity_utilization": (
                    (total_weight_truck / truck_capacities[truck_idx]) * 100 
                    if truck_capacities[truck_idx] > 0 else 0
                ),
                "num_bins": len(selected_bins)
            }
            
            total_bins += len(selected_bins)
            total_weight += total_weight_truck
        
        return {
            "allocations": allocations,
            "total_bins_allocated": total_bins,
            "total_weight_allocated": total_weight,
            "num_trucks_used": len([a for a in allocations.values() if a["num_bins"] > 0]),
            "solve_time": self.solver.last_solve_time
        }
    
    def _default_urgency_calculator(self, bin_obj) -> float:
        """Default urgency calculation if none provided"""
        # Base urgency on fill level
        urgency = bin_obj.fill_level
        
        # Adjust for bin type
        type_multipliers = {
            "hazardous": 1.5,
            "recyclable": 1.0,
            "general": 0.8
        }
        
        bin_type = bin_obj.type.value if hasattr(bin_obj.type, 'value') else str(bin_obj.type)
        urgency *= type_multipliers.get(bin_type.lower(), 1.0)
        
        # Adjust for priority if available
        if hasattr(bin_obj, 'priority'):
            urgency *= (bin_obj.priority * 0.5 + 0.5)  # Priority 1-3 becomes 1.0-2.0 multiplier
        
        return urgency