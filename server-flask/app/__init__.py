import os
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from .config import Config
from .database import init_db


def create_app():
    app = Flask(__name__)
    CORS(app)
    init_db(app)

    from .routes.api import api_bp
    from .routes.auth import auth_bp

    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')

    # Serve uploaded project images
    @app.route('/imgs/<filename>')
    def serve_project_image(filename):
        return send_from_directory(Config.UPLOAD_FOLDER, filename)

    # Health check
    @app.route('/health')
    def health():
        return jsonify({'status': 'ok'})

    return app

# Create app instance for gunicorn
app = create_app()
