import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL from environment
DB_URL = os.getenv('DATABASE_URL')

if not DB_URL:
    print("❌ Error: DB_URL not found in environment variables")
    exit(1)

try:
    # Create engine and test connection
    print("🔌 Attempting to connect to the database...")
    engine = create_engine(DB_URL)

    with engine.connect() as connection:
        # Test connection with a simple query
        print("✅ Successfully connected to the database!")
        print("📊 Database information:")

        # Get database version
        result = connection.execute(text("SELECT version();"))
        db_version = result.scalar()
        print(f"   - PostgreSQL Version: {db_version}")

        # Check if users table exists
        result = connection.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            );
        """))
        users_table_exists = result.scalar()
        print(f"   - Users table exists: {'✅' if users_table_exists else '❌'}")

        # List all tables if users table doesn't exist
        if not users_table_exists:
            print("\n📋 Listing all tables in the database:")
            result = connection.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public';
            """))
            for row in result:
                print(f"   - {row[0]}")

        # Check if there are any users
        if users_table_exists:
            result = connection.execute(text("SELECT COUNT(*) FROM users;"))
            user_count = result.scalar()
            print(f"\n👥 Number of users in database: {user_count}")

            if user_count > 0:
                print("\n👤 Sample user:")
                result = connection.execute(text("SELECT id, email, full_name FROM users LIMIT 1;"))
                user = result.first()
                print(f"   - ID: {user[0]}")
                print(f"   - Email: {user[1]}")
                print(f"   - Name: {user[2] if user[2] else 'Not set'}")

except Exception as e:
    print(f"❌ Error connecting to the database: {e}")
    print("\nTroubleshooting tips:")
    print("1. Check if your RDS instance is running")
    print("2. Verify the database credentials in your .env file")
    print("3. Make sure your IP is whitelisted in the RDS security group")
    print("4. Check if the database name and username are correct")
    print(f"   - Current DB URL: {DB_URL.split('@')[-1] if DB_URL else 'Not found'}")