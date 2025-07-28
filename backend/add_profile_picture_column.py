#!/usr/bin/env python3

import sqlite3
import os

def add_profile_picture_column():
    """Add profile_picture_url column to users table"""
    
    # Database path
    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'coursemate.db')
    
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return
    
    try:
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if column already exists
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'profile_picture_url' in columns:
            print("profile_picture_url column already exists")
            return
        
        # Add the new column
        cursor.execute("ALTER TABLE users ADD COLUMN profile_picture_url VARCHAR(500)")
        conn.commit()
        
        print("Successfully added profile_picture_url column to users table")
        
    except Exception as e:
        print(f"Error adding column: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    add_profile_picture_column()
