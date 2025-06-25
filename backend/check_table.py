from app import create_app
from app.init import db
from sqlalchemy import inspect

app = create_app()

with app.app_context():
    # Get the inspector
    inspector = inspect(db.engine)
    
    # Check if the table exists
    if 'users_courses_goal' in inspector.get_table_names():
        print("Table users_courses_goal exists")
        
        # Get columns
        columns = inspector.get_columns('users_courses_goal')
        print("\nColumns:")
        for column in columns:
            print(f"- {column['name']}: {column['type']}")
        
        # Get foreign keys
        foreign_keys = inspector.get_foreign_keys('users_courses_goal')
        if foreign_keys:
            print("\nForeign Keys:")
            for fk in foreign_keys:
                print(f"- {fk['constrained_columns']} -> {fk['referred_table']}.{fk['referred_columns']}")
    else:
        print("Table users_courses_goal does not exist") 