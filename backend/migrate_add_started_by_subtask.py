#!/usr/bin/env python3
"""
Migration script to add started_by_subtask column to users_courses_goal table
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.init import db, create_app
from sqlalchemy import text

def migrate():
    """Add started_by_subtask column to users_courses_goal table"""
    app = create_app()
    
    with app.app_context():
        try:
            # Add the started_by_subtask column
            db.session.execute(text("""
                ALTER TABLE users_courses_goal 
                ADD COLUMN IF NOT EXISTS started_by_subtask VARCHAR;
            """))
            
            db.session.commit()
            print("✅ Successfully added started_by_subtask column to users_courses_goal table")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error adding started_by_subtask column: {e}")
            raise

if __name__ == "__main__":
    migrate() 