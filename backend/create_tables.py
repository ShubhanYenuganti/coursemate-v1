from app import create_app
from app.init import db
from app.models.goal import Goal

app = create_app()

with app.app_context():
    # Create the users_courses_goal table
    db.metadata.tables['users_courses_goal'].create(db.engine, checkfirst=True)
    print("Table users_courses_goal created successfully!") 