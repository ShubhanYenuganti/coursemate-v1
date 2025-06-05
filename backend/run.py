from app import init
from app.config import Config

from app.init import create_app, db
from app.models.user import User  # Import your models here

app = create_app()

@app.shell_context_processor
def make_shell_context():
    return {'db': db, 'User': User}  # Add other models as needed

if __name__ == "__main__":
    app.run(debug=True, port=app.config['PORT'])
