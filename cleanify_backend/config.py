"""
Configuration settings for Cleanify backend.
Environment reading, global constants, default sliders etc.
"""
import os
from datetime import time


class Config:
    # Flask settings
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    DEBUG = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    
    # Database settings
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///cleanify.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # SocketIO settings
    SOCKETIO_ASYNC_MODE = 'eventlet'
    SOCKETIO_CORS_ALLOWED_ORIGINS = "*"
    
    # OSRM service settings
    OSRM_HOST = os.environ.get('OSRM_HOST') or 'http://localhost:5000'
    OSRM_TIMEOUT = int(os.environ.get('OSRM_TIMEOUT', '5'))
    
    # Simulation settings
    DEFAULT_SIMULATION_SPEED = 1
    MAX_SIMULATION_SPEED = 10
    MIN_SIMULATION_SPEED = 1
    SIMULATION_TICK_RATE = 0.2  # seconds (5 Hz)
    
    # Default working hours
    DEFAULT_WORKING_HOURS = (8, 18)  # 8 AM to 6 PM
    
    # Default collection settings
    DEFAULT_COLLECTIONS_PER_DAY = 2
    
    # Traffic settings
    DEFAULT_TRAFFIC_MODE = "auto"
    DEFAULT_MANUAL_TRAFFIC_MULTIPLIER = 1.0
    MIN_TRAFFIC_MULTIPLIER = 1.0
    MAX_TRAFFIC_MULTIPLIER = 2.0
    
    # Threshold settings
    DEFAULT_THRESHOLD_MODE = "static"
    DEFAULT_STATIC_THRESHOLD = 80.0  # percentage
    
    # Truck settings
    DEFAULT_TRUCK_CAPACITY = 1000.0  # kg
    DEFAULT_TRUCK_SPEED = 50.0  # km/h
    
    # Bin settings
    DEFAULT_BIN_CAPACITY = 100.0  # kg
    DEFAULT_FILL_RATE = 5.0  # kg/hour
    
    # Optimization settings
    VRP_TIME_LIMIT_SECONDS = 30
    KNAPSACK_TIME_LIMIT_SECONDS = 5
    
    # Logging
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    
    # APScheduler settings
    SCHEDULER_API_ENABLED = True
    SCHEDULER_TIMEZONE = 'UTC'


class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///cleanify_dev.db'


class ProductionConfig(Config):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///cleanify_prod.db'


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}