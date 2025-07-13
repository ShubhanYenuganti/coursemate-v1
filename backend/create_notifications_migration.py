#!/usr/bin/env python3

"""
Notifications Table Migration Script
Adds the notifications table to the existing database
"""

import sys
import os

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.init import create_app, db
from app.models.notification import Notification

def create_notifications_table():
    """Create the notifications table and related indexes"""
    app = create_app()
    
    with app.app_context():
        try:
            # Create all tables (will only create missing ones)
            db.create_all()
            
            print("✅ Successfully created notifications table and related indexes")
            print("📋 Notifications table schema:")
            print("   - id: String (UUID, Primary Key)")
            print("   - user_id: String (Foreign Key to users.id)")
            print("   - sender_id: String (Foreign Key to users.id, nullable)")
            print("   - type: String(50), not null")
            print("   - title: String(200), not null")
            print("   - message: Text, not null")
            print("   - data: JSON object")
            print("   - is_read: Boolean, default False")
            print("   - created_at: DateTime")
            print("")
            print("🔗 Relationships:")
            print("   - user: Many-to-one with User (recipient)")
            print("   - sender: Many-to-one with User (sender, nullable)")
            print("")
            print("📝 Notification Types:")
            print("   - course_invite: Course invitation notifications")
            print("   - friend_request: Friend request notifications")
            print("   - course_invite_accepted: Course invite acceptance notifications")
            print("")
            print("✅ Migration completed successfully!")
            
        except Exception as e:
            print(f"❌ Error creating notifications table: {e}")
            sys.exit(1)

if __name__ == "__main__":
    print("🚀 Starting Notifications Table Migration...")
    print("=" * 50)
    create_notifications_table() 