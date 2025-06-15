"""
Entry-point –   $ python run.py
Creates app, SocketIO server and starts the main process.
Nothing “smart” lives here.
"""
from cleanify import create_app
from cleanify.extensions import socketio

app = create_app()

if __name__ == "__main__":
    # For dev: use eventlet/gevent; in prod use gunicorn + gevent worker.
    socketio.run(app, host="0.0.0.0", port=8000, debug=True)
