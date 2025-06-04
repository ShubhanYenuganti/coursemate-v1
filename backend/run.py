from app import init
from app.config import Config

app = init.create_app()

if __name__ == "__main__":
    app.run(debug=True, port=app.config['PORT'])
