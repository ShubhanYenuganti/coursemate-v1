from app import create_app
from app.models.goal import Goal
from app.init import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    # Drop the users_courses_goal table first
    conn = db.engine.connect()
    try:
        conn.execute(text("DROP TABLE IF EXISTS users_courses_goal CASCADE;"))
        print("Dropped users_courses_goal table")
        conn.commit()
    except Exception as e:
        print(f"Error dropping table: {str(e)}")
    finally:
        conn.close()
    
    # Create all tables
    db.create_all()
    print("Tables recreated successfully!") 