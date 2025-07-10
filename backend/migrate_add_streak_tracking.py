#!/usr/bin/env python3
"""
Migration script to add streak tracking fields to users table
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.init import create_app, db
from sqlalchemy import text

def migrate():
    app = create_app()
    
    with app.app_context():
        try:
            # Add streak tracking columns to users table
            db.session.execute(text("""
                ALTER TABLE users 
                ADD COLUMN last_visit_date DATE,
                ADD COLUMN current_streak INTEGER DEFAULT 0,
                ADD COLUMN longest_streak INTEGER DEFAULT 0
            """))
            
            db.session.commit()
            print("✅ Successfully added streak tracking fields to users table")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error adding streak tracking fields: {e}")
            raise

if __name__ == "__main__":
    migrate() 