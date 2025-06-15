"""
Collects all route blueprints in one call so app factory
doesn’t have to know filenames.
"""
from flask import Flask
from .routes import simulation, settings, bins, trucks, optimization

def register_api_blueprints(app: Flask) -> None:
    app.register_blueprint(simulation.bp,   url_prefix="/api/simulation")
    app.register_blueprint(settings.bp,     url_prefix="/api/settings")
    app.register_blueprint(bins.bp,         url_prefix="/api/bins")
    app.register_blueprint(trucks.bp,       url_prefix="/api/trucks")
    app.register_blueprint(optimization.bp, url_prefix="/api/optimization")
