from flask import Blueprint, request, jsonify, current_app
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import jwt
import datetime
from app.config import Config
from app.database import execute_query
from functools import wraps

auth_bp = Blueprint('auth', __name__)


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header:
            return jsonify({'message': 'Token is missing!'}), 401

        token = auth_header
        if token.startswith('Bearer '):
            token = token.split(" ", 1)[1]

        try:
            data = jwt.decode(token, Config.JWT_SECRET, algorithms=["HS256"])
            request.current_user = data
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token expired!'}), 401
        except Exception:
            # Don't leak jwt library internals via str(e) to the client
            return jsonify({'message': 'Token is invalid!'}), 401

        return f(*args, **kwargs)
    return decorated


@auth_bp.route('/google-login', methods=['POST', 'OPTIONS'])
def google_login():
    if request.method == 'OPTIONS':
        return '', 200

    data = request.get_json(silent=True) or {}
    token = data.get('token')

    if not token:
        return jsonify({'error': 'No token provided'}), 400

    try:
        idinfo = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            Config.GOOGLE_CLIENT_ID
        )

        # Defense in depth: id_token.verify_oauth2_token already checks aud/iss/exp,
        # but explicit checks here are cheap insurance and document intent.
        if idinfo.get('iss') not in ('accounts.google.com', 'https://accounts.google.com'):
            return jsonify({'error': 'Invalid token issuer'}), 401

        if not idinfo.get('email_verified'):
            return jsonify({'error': 'Email no verificado en Google'}), 403

        email = idinfo['email']
        name = idinfo.get('name', '')
        google_id = idinfo['sub']

        if email not in Config.ALLOWED_ADMINS:
            return jsonify({'error': 'No tienes permisos de administrador'}), 403

        user = execute_query(
            "SELECT * FROM users WHERE email = %s",
            (email,), fetch_one=True
        )
        if not user:
            execute_query(
                "INSERT INTO users (email, full_name, google_id) VALUES (%s, %s, %s)",
                (email, name, google_id)
            )

        session_token = jwt.encode({
            'email': email,
            'name': name,
            'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=24)
        }, Config.JWT_SECRET, algorithm="HS256")

        return jsonify({
            'token': session_token,
            'user': {'email': email, 'name': name}
        })

    except ValueError:
        # Invalid token signature/audience/expiry — log internally, generic message out
        current_app.logger.exception("Google token verification failed")
        return jsonify({'error': 'Invalid Google token'}), 401
    except Exception:
        current_app.logger.exception("Unexpected error during Google login")
        return jsonify({'error': 'Server error'}), 500
