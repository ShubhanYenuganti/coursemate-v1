# import eventlet
# eventlet.monkey_patch()

from app.config import Config
from dotenv import load_dotenv
import os

# Load environment variables from .flaskenv and .env
# This ensures they are available when running with `python run.py`
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.flaskenv'))
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from app import create_app, db
from app.models.user import User  # Import your models here
from app.extensions import socketio

print(">>> Before create_app", flush=True)
app = create_app()
print(">>> After create_app", flush=True)

@app.shell_context_processor
def make_shell_context():
    return {'db': db, 'User': User}  # Add other models as needed

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5173, debug=True, allow_unsafe_werkzeug=True)
