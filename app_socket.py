from flask_socketio import SocketIO
from flask import Flask

app = Flask(__name__)
app.config['DEBUG'] = False  # Explicitly disable debug mode
app.debug = False

socketio = SocketIO(app, cors_allowed_origins="*", debug=True)

def send_socket_message(event_type, data = None):
    if data:
        socketio.emit(event_type, data)
    else:
        socketio.emit(event_type)
