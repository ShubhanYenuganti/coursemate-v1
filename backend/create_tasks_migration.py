#!/usr/bin/env python3
"""
Migration script to create the tasks table
"""
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.init import db
from app.models.task import Task

def create_tasks_table():
    """Create the tasks table"""
    app = create_app()
    
    with app.app_context():
        try:
            # Create the tasks table
            db.create_all()
            print("✅ Tasks table created successfully!")
            
            # Verify the table was created
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()
            
            if 'tasks' in tables:
                print("✅ Tasks table verified in database")
                print(f"📋 Available tables: {', '.join(tables)}")
            else:
                print("❌ Tasks table not found in database")
                
        except Exception as e:
            print(f"❌ Error creating tasks table: {e}")
            return False
    
    return True

if __name__ == "__main__":
    print("🚀 Starting tasks table migration...")
    success = create_tasks_table()
    
    if success:
        print("🎉 Migration completed successfully!")
    else:
        print("💥 Migration failed!")
        sys.exit(1) 