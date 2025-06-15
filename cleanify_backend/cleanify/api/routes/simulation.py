"""
Play / pause / speed endpoints.
These all forward to SimulationService – keep route funcs thin.
"""
from flask import Blueprint, request, jsonify
from cleanify import simulation_service

bp = Blueprint("simulation", __name__)

@bp.post("/start")
def start():
    simulation_service.resume()
    return jsonify({"status": "running"})

@bp.post("/pause")
def pause():
    simulation_service.pause()
    return jsonify({"status": "paused"})
