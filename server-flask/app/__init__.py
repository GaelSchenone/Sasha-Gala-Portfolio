import os
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from .config import Config, _in_docker
from .database import init_db


def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = Config.SECRET_KEY
    CORS(app, resources={r"/*": {"origins": Config.ALLOWED_ORIGINS}})

    try:
        init_db(app)
    except Exception as e:
        app.logger.warning(f"Database not available at startup: {e}. App will start but DB queries will fail.")

    from .routes.api import api_bp
    from .routes.auth import auth_bp

    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')

    @app.after_request
    def add_security_headers(response):
        response.headers['Cross-Origin-Opener-Policy'] = 'same-origin-allow-popups'
        return response

    # Debug: print registered routes
    @app.route('/debug-routes')
    def debug_routes():
        routes = []
        for rule in app.url_map.iter_rules():
            routes.append({
                'rule': str(rule),
                'methods': list(rule.methods - {'HEAD', 'OPTIONS'}),
                'endpoint': rule.endpoint
            })
        return jsonify({'routes': routes})

    # Serve uploaded project images
    @app.route('/imgs/<filename>')
    def serve_project_image(filename):
        return send_from_directory(Config.UPLOAD_FOLDER, filename)

    # Health check
    @app.route('/health')
    def health():
        from .database import db_pool
        db_status = 'connected' if db_pool else 'disconnected'
        return jsonify({
            'status': 'ok',
            'db': db_status,
            'upload_folder': Config.UPLOAD_FOLDER,
            'project_root': Config.PROJECT_ROOT,
            'in_docker': _in_docker,
            'debug': Config.DEBUG,
        })

    return app

# Create app instance for gunicorn
app = create_app()
