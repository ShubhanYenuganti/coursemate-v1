from app import init
from app.config import Config
from dotenv import load_dotenv
import os

# Load environment variables from .flaskenv and .env
# This ensures they are available when running with `python run.py`
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.flaskenv'))
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from app import create_app, db
from app.models.user import User  # Import your models here

print(">>> Before create_app", flush=True)
app = create_app()
print(">>> After create_app", flush=True)

@app.shell_context_processor
def make_shell_context():
    return {'db': db, 'User': User}  # Add other models as needed

if __name__ == "__main__":
    port = int(os.environ.get("FLASK_RUN_PORT", 5000))
    app.run(debug=True, port=port)
