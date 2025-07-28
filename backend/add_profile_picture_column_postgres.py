#!/usr/bin/env python3

import psycopg2
import os
from urllib.parse import urlparse
from dotenv import load_dotenv

def add_profile_picture_column():
    """Add profile_picture_url column to users table in PostgreSQL"""
    
    # Load environment variables
    load_dotenv()
    
    # Get database URL from environment
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("DATABASE_URL not found in environment variables")
        return
    
    try:
        # Parse the database URL
        parsed = urlparse(database_url)
        
        # Connect to PostgreSQL
        conn = psycopg2.connect(
            host=parsed.hostname,
            port=parsed.port or 5432,
            database=parsed.path[1:],  # Remove leading '/'
            user=parsed.username,
            password=parsed.password
        )
        
        cursor = conn.cursor()
        
        # Check if column already exists
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'profile_picture_url'
        """)
        
        if cursor.fetchone():
            print("profile_picture_url column already exists")
            return
        
        # Add the new column
        cursor.execute("ALTER TABLE users ADD COLUMN profile_picture_url VARCHAR(500)")
        conn.commit()
        
        print("Successfully added profile_picture_url column to users table")
        
    except Exception as e:
        print(f"Error adding column: {e}")
        if 'conn' in locals():
            conn.rollback()
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    add_profile_picture_column()
