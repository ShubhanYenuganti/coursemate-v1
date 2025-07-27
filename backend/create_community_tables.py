#!/usr/bin/env python3

"""
Community Forum Tables Migration Script
Creates the community forum tables in the existing database
"""

import sys
import os

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.init import create_app, db
from app.models.community import CommunityPost, CommunityAnswer, CommunityPostVote, CommunityAnswerVote

def create_community_tables():
    """Create the community forum tables and related indexes"""
    app = create_app()
    
    with app.app_context():
        try:
            # Create all tables (will only create missing ones)
            db.create_all()
            
            print("✅ Successfully created community forum tables!")
            print("📋 Community Tables Schema:")
            print("   - users_courses_community: Main posts table")
            print("   - users_courses_community_answers: Answers to posts")
            print("   - users_courses_community_post_votes: Votes on posts")
            print("   - users_courses_community_answer_votes: Votes on answers")
            print("")
            print("🔗 Relationships:")
            print("   - Posts belong to courses and users")
            print("   - Answers belong to posts and users")
            print("   - Votes track user interactions with posts/answers")
            print("")
            print("📝 Post Types:")
            print("   - question: Ask for help or clarification")
            print("   - discussion: Start a general discussion")
            print("   - study-group: Organize study sessions")
            print("   - resource-sharing: Share helpful materials")
            print("   - help-wanted: Looking for collaboration")
            print("")
            print("✅ Migration completed successfully!")
            
        except Exception as e:
            print(f"❌ Error creating community tables: {e}")
            sys.exit(1)

if __name__ == "__main__":
    print("🚀 Starting Community Forum Tables Migration...")
    print("=" * 60)
    create_community_tables()
