#!/usr/bin/env python3

"""
Migration script to add 'deleted' type to post_type_enum
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db
from sqlalchemy import text

def add_deleted_post_type():
    """Add 'deleted' type to the post_type_enum"""
    
    app = create_app()
    
    with app.app_context():
        try:
            # Add 'deleted' to the enum type
            with db.engine.connect() as conn:
                conn.execute(text("ALTER TYPE post_type_enum ADD VALUE 'deleted'"))
                conn.commit()
            
            print("✅ Successfully added 'deleted' type to post_type_enum")
            
        except Exception as e:
            print(f"❌ Error adding deleted type to enum: {e}")
            # It might already exist, let's check
            try:
                with db.engine.connect() as conn:
                    result = conn.execute(text("SELECT unnest(enum_range(NULL::post_type_enum))"))
                    enum_values = [row[0] for row in result]
                    
                    if 'deleted' in enum_values:
                        print("✅ 'deleted' type already exists in post_type_enum")
                    else:
                        print(f"❌ Available enum values: {enum_values}")
                        raise e
            except Exception as inner_e:
                print(f"❌ Error checking enum values: {inner_e}")

if __name__ == "__main__":
    add_deleted_post_type()
