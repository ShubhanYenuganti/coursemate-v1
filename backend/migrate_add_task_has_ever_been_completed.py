#!/usr/bin/env python3
"""
Migration script to add task_has_ever_been_completed column to users_courses_goal table
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.init import db, create_app
from sqlalchemy import text

def migrate():
    """Add task_has_ever_been_completed column to users_courses_goal table"""
    app = create_app()
    
    with app.app_context():
        try:
            # Add the task_has_ever_been_completed column
            db.session.execute(text("""
                ALTER TABLE users_courses_goal 
                ADD COLUMN IF NOT EXISTS task_has_ever_been_completed BOOLEAN DEFAULT FALSE;
            """))
            
            db.session.commit()
            print("✅ Successfully added task_has_ever_been_completed column to users_courses_goal table")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error adding task_has_ever_been_completed column: {e}")
            raise

if __name__ == "__main__":
    migrate() 