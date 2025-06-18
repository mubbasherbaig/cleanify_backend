# 1. First, install Flask-CORS
# pip install flask-cors

# 2. Update your cleanify/__init__.py file:

"""
App factory – assembles Flask, blueprints, SocketIO, background services.
Importing this module should **never** trigger a heavy simulation run.
"""
from flask import Flask
from flask_cors import CORS  # Add this import
from .extensions import db, socketio, scheduler, _init_scheduler
from .api import register_api_blueprints
from .sockets.events import register_socket_handlers
from .core.services.simulation_service import SimulationService
from config import Config

simulation_service: SimulationService | None = None   # global handle

def create_app(config_class=Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)

    # ---- Enable CORS ----
    CORS(app, origins=["*"], supports_credentials=True)  # Add this line
    
    # ---- Init extensions ----
    db.init_app(app)
    socketio.init_app(app, cors_allowed_origins="*")
    _init_scheduler(app)

    # Schedule any default jobs after the scheduler is running
    from .tasks.scheduler import initialize_default_jobs
    initialize_default_jobs()

    # ---- Register routes ----
    register_api_blueprints(app)
    register_socket_handlers(socketio)

    # ---- Start background sim ----
    global simulation_service
    simulation_service = SimulationService(socketio)
    simulation_service.start()          # non-blocking thread/greenlet
    app.simulation_service = simulation_service
    return app