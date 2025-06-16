"""
Central place to create extension singletons.
Keeps circular imports out of the rest of the code base.
"""
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.memory import MemoryJobStore

socketio  = SocketIO(async_mode="threading")    # emit from any thread
db        = SQLAlchemy()
scheduler = BackgroundScheduler()

def _init_scheduler(app):
    """Configure and start scheduler with required job stores."""
    jobstores = {
        "default": MemoryJobStore(),
        "collections": MemoryJobStore(),
        "maintenance": MemoryJobStore(),
    }

    scheduler.configure(jobstores=jobstores, timezone=app.config.get("SCHEDULER_TIMEZONE", "UTC"))

    if not scheduler.running:
        scheduler.start()