from app import create_app
from app.init import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    # Add new columns for task-based time tracking
    conn = db.engine.connect()
    try:
        # Add task_engagement_start column
        conn.execute(text("""
            ALTER TABLE users_courses_goal 
            ADD COLUMN IF NOT EXISTS task_engagement_start TIMESTAMP WITH TIME ZONE;
        """))
        print("Added task_engagement_start column")
        
        # Add task_engagement_end column
        conn.execute(text("""
            ALTER TABLE users_courses_goal 
            ADD COLUMN IF NOT EXISTS task_engagement_end TIMESTAMP WITH TIME ZONE;
        """))
        print("Added task_engagement_end column")
        
        # Add task_estimated_time_minutes column
        conn.execute(text("""
            ALTER TABLE users_courses_goal 
            ADD COLUMN IF NOT EXISTS task_estimated_time_minutes INTEGER DEFAULT 60;
        """))
        print("Added task_estimated_time_minutes column")
        
        # Add task_actual_time_minutes column
        conn.execute(text("""
            ALTER TABLE users_courses_goal 
            ADD COLUMN IF NOT EXISTS task_actual_time_minutes INTEGER DEFAULT 0;
        """))
        print("Added task_actual_time_minutes column")
        
        # Add task_is_being_tracked column
        conn.execute(text("""
            ALTER TABLE users_courses_goal 
            ADD COLUMN IF NOT EXISTS task_is_being_tracked BOOLEAN DEFAULT FALSE;
        """))
        print("Added task_is_being_tracked column")
        
        conn.commit()
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Error during migration: {str(e)}")
        conn.rollback()
    finally:
        conn.close() 