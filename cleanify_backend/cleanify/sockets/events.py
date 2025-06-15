"""
All Socket.IO event handlers go here.
We only need a couple of client-emitted events (front-end seldom emits).
"""
from flask_socketio import SocketIO, emit

def register_socket_handlers(sio: SocketIO) -> None:

    @sio.on("connect")
    def _connect():
        emit("server_message", {"msg": "Connected to Cleanify backend"})

    # add more if FE ever needs to push data back (e.g. “manual_jog_truck”)
