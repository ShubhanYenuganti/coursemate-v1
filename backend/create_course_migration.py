#!/usr/bin/env python3

"""
Course Table Migration Script
Adds the courses table to the existing database
"""

import sys
import os

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.init import create_app, db
from app.models.user import User
from app.models.course import Course

def create_course_table():
    """Create the course table and related indexes"""
    app = create_app()
    
    with app.app_context():
        try:
            # Create all tables (will only create missing ones)
            db.create_all()
            
            print("✅ Successfully created course table and related indexes")
            print("📋 Course table schema:")
            print("   - id: String (UUID, Primary Key)")
            print("   - user_id: String (Foreign Key to users.id)")
            print("   - title: String(200), not null")
            print("   - subject: String(100), not null") 
            print("   - course_code: String(20), nullable")
            print("   - semester: String(50), not null")
            print("   - professor: String(100), nullable")
            print("   - units: Integer, default 3")
            print("   - variable_units: Boolean, default False")
            print("   - description: Text, not null")
            print("   - visibility: Enum(Public, Private, Only Me, Friends Only)")
            print("   - tags: JSON array")
            print("   - collaborators: JSON array")
            print("   - daily_progress: Integer, default 0")
            print("   - is_pinned: Boolean, default False") 
            print("   - is_archived: Boolean, default False")
            print("   - badge: Enum(Creator, Enrolled)")
            print("   - course_image: String(500), nullable")
            print("   - materials: JSON array")
            print("   - created_at: DateTime")
            print("   - updated_at: DateTime")
            print("   - last_accessed: DateTime")
            print("")
            print("🔗 Relationships:")
            print("   - courses.user_id -> users.id (Foreign Key)")
            print("   - User.courses (backref with cascade delete)")
            
        except Exception as e:
            print(f"❌ Error creating course table: {e}")
            return False
            
    return True

def verify_migration():
    """Verify that the migration was successful"""
    app = create_app()
    
    with app.app_context():
        try:
            # Try to query the course table
            Course.query.limit(1).all()
            print("✅ Course table is accessible and working")
            return True
        except Exception as e:
            print(f"❌ Course table verification failed: {e}")
            return False

if __name__ == "__main__":
    print("🚀 Starting Course Table Migration...")
    print("=" * 50)
    
    if create_course_table():
        if verify_migration():
            print("=" * 50)
            print("✅ Migration completed successfully!")
            print("🎯 You can now create and manage courses through the API")
        else:
            print("=" * 50)
            print("⚠️  Migration completed but verification failed")
            sys.exit(1)
    else:
        print("=" * 50)
        print("❌ Migration failed")
        sys.exit(1) 