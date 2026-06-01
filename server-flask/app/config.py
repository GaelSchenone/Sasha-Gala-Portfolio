import os
from dotenv import load_dotenv

# Load .env - try project root first (dev), then same dir as app/ (prod)
_server_dir = os.path.dirname(os.path.dirname(__file__))
_project_root = os.path.dirname(_server_dir)
_env_path = os.path.join(_server_dir, '.env')
if not os.path.exists(_env_path):
    _env_path = os.path.join(_project_root, '.env')
load_dotenv(_env_path)

# Detect production - /.dockerenv may not exist in all runtimes, also check WORKDIR convention
_in_docker = os.path.exists('/.dockerenv') or os.path.exists('/app/.dockerenv') or os.getenv('IN_DOCKER', '').lower() == 'true'


class Config:
    # Database
    DB_USER = os.getenv('DB_USER', 'root')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '1234')
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = int(os.getenv('DB_PORT', '3306'))
    DB_NAME = os.getenv('DB_NAME', 'testpy')

    # Flask - HARD FAIL if SECRET_KEY missing in production (no insecure default)
    SECRET_KEY = os.getenv('SECRET_KEY')
    if not SECRET_KEY:
        if _in_docker:
            raise RuntimeError(
                "SECRET_KEY environment variable is required in production. "
                "Set it in your hosting provider (Dokploy)."
            )
        SECRET_KEY = 'dev_key_sasha_portfolio_2024'

    DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'

    # Google OAuth
    GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '')

    # Admin whitelist
    _admin_emails = os.getenv('ADMIN_EMAILS', 'gaelsantos034@gmail.com')
    ALLOWED_ADMINS = [e.strip() for e in _admin_emails.split(',') if e.strip()]

    # CORS allowed origins
    _allowed_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:5173,http://localhost:3000,https://sasha.aguilucho.ar,https://sashagala.com.ar')
    ALLOWED_ORIGINS = [o.strip() for o in _allowed_origins.split(',') if o.strip()]

    # JWT - HARD FAIL if JWT_SECRET missing in production (no insecure default)
    JWT_SECRET = os.getenv('JWT_SECRET')
    if not JWT_SECRET:
        if _in_docker:
            raise RuntimeError(
                "JWT_SECRET environment variable is required in production. "
                "Set it in your hosting provider (Dokploy)."
            )
        JWT_SECRET = 'dev_jwt_key_change_in_production'

    # Base dir = directory where wsgi.py / app/ lives
    BASE_DIR = _server_dir

    # Project root (for dev: one level above server-flask/; for prod: same as BASE_DIR)
    PROJECT_ROOT = os.getenv('PROJECT_ROOT', _project_root)

    # Static folder for React build
    STATIC_FOLDER = os.getenv('DIST_FOLDER', os.path.join(PROJECT_ROOT, 'client-react', 'dist'))

    # Cloudinary
    CLOUDINARY_URL = os.getenv('CLOUDINARY_URL', '')
    CLOUDINARY_CLOUD_NAME = os.getenv('CLOUDINARY_CLOUD_NAME', '')
