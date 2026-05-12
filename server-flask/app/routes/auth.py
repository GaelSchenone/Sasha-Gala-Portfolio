from flask import Blueprint, request, jsonify
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
            token = token.split(" ")[1]

        try:
            data = jwt.decode(token, Config.JWT_SECRET, algorithms=["HS256"])
            request.current_user = data
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token expired!'}), 401
        except Exception as e:
            return jsonify({'message': 'Token is invalid!', 'error': str(e)}), 401

        return f(*args, **kwargs)
    return decorated


@auth_bp.route('/google-login', methods=['POST', 'OPTIONS'])
def google_login():
    if request.method == 'OPTIONS':
        return '', 200

    data = request.get_json()
    token = data.get('token')

    # Logging temporal
    print(f"Token recibido: {token[:20] if token else 'VACIO/NONE'}", flush=True)

    try:
        idinfo = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            Config.GOOGLE_CLIENT_ID
        )
    except ValueError as e:
        print(f"ValueError: {e}", flush=True)
        return jsonify({'error': 'Invalid Google token', 'detail': str(e)}), 400

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
        return jsonify({'error': 'Invalid Google token'}), 400
