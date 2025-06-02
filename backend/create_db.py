from app import init

# Create the Flask app
app = init.create_app()

# Get the db instance from your init module
db = init.db  # Assuming your db instance is available as init.db

with app.app_context():
    # Print current configuration for debugging
    print(f"Database URI: {app.config.get('SQLALCHEMY_DATABASE_URI')}")

    # Create all tables based on your models
    db.create_all()

    print("Database tables created successfully!")

    # Optional: Create a test user
    # Uncomment if you want to test with a pre-created user
    # from app.models.user import User
    # test_user = User(email="test@example.com")
    # test_user.set_password("password123")
    # db.session.add(test_user)
    # db.session.commit()
    # print("Test user created!")