from app import init

app = init.create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5173)
