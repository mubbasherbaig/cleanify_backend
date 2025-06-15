"""
Central place to create extension singletons.
Keeps circular imports out of the rest of the code base.
"""
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
from apscheduler.schedulers.background import BackgroundScheduler

socketio  = SocketIO(async_mode="eventlet")     # emit from any thread
db        = SQLAlchemy()
scheduler = BackgroundScheduler()
