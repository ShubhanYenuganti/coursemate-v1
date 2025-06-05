import os
from app.init import create_app, db
from flask_migrate import Migrate, upgrade, migrate as migrate_db

def run_migrations():
    app = create_app()
    with app.app_context():
        # Create migrations directory if it doesn't exist
        migrations_dir = os.path.join(os.path.dirname(__file__), 'migrations')
        if not os.path.exists(migrations_dir):
            os.makedirs(migrations_dir)
            
        # Initialize migrations if needed
        from flask_migrate import init as migrate_init
        try:
            migrate_init()
        except:
            pass  # Already initialized
            
        # Create a new migration
        migrate_db(message='Add email verification and password reset fields')
        
        # Apply migrations
        upgrade()
        
        print("Database migration completed successfully!")

if __name__ == '__main__':
    run_migrations()
