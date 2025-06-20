# Create a temporary script called find_db.py
from app import create_app
import os

app = create_app()
with app.app_context():
    # Get the configured database URI
    db_uri = app.config.get('SQLALCHEMY_DATABASE_URI')
    print(f"Database URI: {db_uri}")

    # If using SQLite, this will show the file path
    if db_uri and db_uri.startswith('sqlite:///'):
        db_path = db_uri.replace('sqlite:///', '')
        full_path = os.path.abspath(db_path)
        print(f"Full path: {full_path}")
        print(f"File exists: {os.path.exists(full_path)}")