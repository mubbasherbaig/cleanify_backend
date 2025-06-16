"""
App factory – assembles Flask, blueprints, SocketIO, background services.
Importing this module should **never** trigger a heavy simulation run.
"""
from flask import Flask
from .extensions import db, socketio, scheduler, _init_scheduler
from .api import register_api_blueprints
from .sockets.events import register_socket_handlers
from .core.services.simulation_service import SimulationService
from config import Config

simulation_service: SimulationService | None = None   # global handle

def create_app(config_class=Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)

    # ---- Init extensions ----
    db.init_app(app)
    socketio.init_app(app, cors_allowed_origins="*")
    _init_scheduler(app)
    # scheduler.configure(timezone=app.config.get("SCHEDULER_TIMEZONE", "UTC"))
    # scheduler.start()

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
