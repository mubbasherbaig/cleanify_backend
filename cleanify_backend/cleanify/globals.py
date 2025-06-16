# 1. First, create a new file: cleanify/globals.py
"""
Global application state to avoid circular imports.
"""

# Global variable to hold the simulation service instance
simulation_service = None

def get_simulation_service():
    """Get the global simulation service instance"""
    global simulation_service
    if simulation_service is None:
        raise RuntimeError("Simulation service not initialized")
    return simulation_service

def set_simulation_service(service):
    """Set the global simulation service instance"""
    global simulation_service
    simulation_service = service