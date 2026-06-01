import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from .config import Config, _in_docker
from .database import init_db


def create_app():
    print(f"[STARTUP] Creating Flask app | IN_DOCKER={_in_docker} | DEBUG={Config.DEBUG}", flush=True)
    print(f"[STARTUP] CLOUDINARY_CLOUD_NAME={Config.CLOUDINARY_CLOUD_NAME} | PROJECT_ROOT={Config.PROJECT_ROOT}", flush=True)

    app = Flask(__name__)
    app.config['SECRET_KEY'] = Config.SECRET_KEY
    app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB
    CORS(app, resources={r"/*": {"origins": Config.ALLOWED_ORIGINS}})

    init_db(app)

    from .routes.api import api_bp
    from .routes.auth import auth_bp

    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')

    @app.after_request
    def add_security_headers(response):
        response.headers['Cross-Origin-Opener-Policy'] = 'same-origin-allow-popups'
        # Ensure CORS headers are present on ALL responses (including error 401/500)
        # Flask-CORS sometimes skips them on early-abort responses
        origin = request.headers.get('Origin', '')
        if origin in Config.ALLOWED_ORIGINS and not response.headers.get('Access-Control-Allow-Origin'):
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,ngrok-skip-browser-warning'
            response.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS'
        return response

    # Health check — public, minimal info to avoid infra enumeration
    @app.route('/health')
    def health():
        from .database import db_pool
        return jsonify({
            'status': 'ok' if db_pool else 'degraded',
            'db': 'connected' if db_pool else 'disconnected',
        })

    print("[STARTUP] Flask app created successfully", flush=True)
    return app
