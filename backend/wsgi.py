# IMPORTANT: Monkey patch eventlet BEFORE any other imports
# This must be the first import to avoid monkey patching errors
import eventlet
eventlet.monkey_patch()

from app.init import create_app

app = create_app()

if __name__ == "__main__":
    app.run()
