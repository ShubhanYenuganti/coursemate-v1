from app import create_app
from app.init import db
from sqlalchemy import text, inspect

app = create_app()

with app.app_context():
    # Add tasks column to users_courses_goal table
    inspector = inspect(db.engine)
    columns = inspector.get_columns('users_courses_goal')
    column_names = [column['name'] for column in columns]
    
    conn = db.engine.connect()
    
    if 'tasks' not in column_names:
        try:
            # Start a transaction
            trans = conn.begin()
            
            # Add the column
            conn.execute(text("ALTER TABLE users_courses_goal ADD COLUMN tasks JSON"))
            
            # Commit the transaction
            trans.commit()
            print("Added 'tasks' JSON column to users_courses_goal table")
        except Exception as e:
            # Rollback in case of error
            trans.rollback()
            print(f"Error adding column: {str(e)}")
    else:
        print("Column 'tasks' already exists in users_courses_goal table")
    
    conn.close() 