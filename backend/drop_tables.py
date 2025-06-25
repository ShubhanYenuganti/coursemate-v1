from app import create_app
from app.init import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    # Drop specific tables
    conn = db.engine.connect()
    
    # List of tables to drop
    tables_to_drop = [
        'user_goals',
        'goal_tasks', 
        'goal_subtasks',
        'tasks'
    ]
    
    # Drop each table if it exists
    for table in tables_to_drop:
        try:
            conn.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE;"))
            print(f"Dropped table {table}")
        except Exception as e:
            print(f"Error dropping {table}: {str(e)}")
    
    conn.commit()
    conn.close()
    
    print("Tables dropped successfully!") 