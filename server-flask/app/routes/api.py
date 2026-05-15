import os
import json
import uuid
import cloudinary
import cloudinary.uploader
from flask import Blueprint, jsonify, request, current_app
from app.database import execute_query
from app.routes.auth import token_required
from app.config import Config
from werkzeug.utils import secure_filename

api_bp = Blueprint('api', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}

# Configure Cloudinary from CLOUDINARY_URL or individual vars
if Config.CLOUDINARY_URL:
    cloudinary.config(cloudinary_url=Config.CLOUDINARY_URL, secure=True)
elif Config.CLOUDINARY_CLOUD_NAME:
    cloudinary.config(
        cloud_name=Config.CLOUDINARY_CLOUD_NAME,
        api_key=os.getenv('CLOUDINARY_API_KEY', ''),
        api_secret=os.getenv('CLOUDINARY_API_SECRET', ''),
        secure=True,
    )


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def parse_layout_json(project):
    if project.get('layout_json') and isinstance(project['layout_json'], str):
        try:
            project['layout_json'] = json.loads(project['layout_json'])
        except json.JSONDecodeError:
            project['layout_json'] = {"sections": []}
    elif not project.get('layout_json'):
        project['layout_json'] = {"sections": []}


def upload_to_cloudinary(file_bytes, public_id):
    """Upload image bytes to Cloudinary with auto format/quality."""
    result = cloudinary.uploader.upload(
        file_bytes,
        public_id=public_id,
        folder="sasha-portfolio",
        overwrite=True,
        transformation=[
            {"quality": "auto", "fetch_format": "auto"},
        ],
    )
    return result


def delete_from_cloudinary(public_id):
    """Delete an image from Cloudinary by public_id."""
    try:
        cloudinary.uploader.destroy(public_id)
    except Exception:
        pass


# ── READ ──────────────────────────────────────────────────────

@api_bp.route('/projects')
def get_projects():
    status = request.args.get('status')
    project_type = request.args.get('type')

    where_clauses = []
    params = []

    if status:
        where_clauses.append("p.status = %s")
        params.append(status)
    if project_type:
        where_clauses.append("p.project_type = %s")
        params.append(project_type)

    where_sql = (" WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    query = f"""
        SELECT p.*,
        (SELECT img_route FROM images i
         WHERE i.project_id = p.project_id
         ORDER BY display_order ASC LIMIT 1) as project_main_image
        FROM proyectos p
        {where_sql}
        ORDER BY p.project_id ASC
    """
    projects = execute_query(query, tuple(params) if params else None)
    if projects is None:
        return jsonify({'error': 'DB Error'}), 500

    for p in projects:
        parse_layout_json(p)

    return jsonify({'projects': projects})


@api_bp.route('/projects/<int:project_id>')
def get_project(project_id):
    project = execute_query(
        "SELECT * FROM proyectos WHERE project_id = %s",
        (project_id,), fetch_one=True
    )
    if not project:
        return jsonify({'error': 'Not found'}), 404

    parse_layout_json(project)

    images = execute_query(
        "SELECT * FROM images WHERE project_id = %s ORDER BY display_order ASC",
        (project_id,)
    )
    project['images'] = images or []

    return jsonify({'project': project})


@api_bp.route('/projects/name/<project_name>')
def get_project_by_name(project_name):
    project = execute_query(
        "SELECT * FROM proyectos WHERE project_name = %s",
        (project_name,), fetch_one=True
    )
    if not project:
        return jsonify({'error': 'Not found'}), 404

    parse_layout_json(project)

    images = execute_query(
        "SELECT * FROM images WHERE project_id = %s ORDER BY display_order ASC",
        (project['project_id'],)
    )
    project['images'] = images or []

    return jsonify({'project': project})


@api_bp.route('/projectimages')
def get_project_images():
    images = execute_query(
        """SELECT i.* FROM images i
        JOIN proyectos p ON i.project_id = p.project_id
        WHERE i.status_id = 1 AND p.status = 'published'
        ORDER BY i.project_id, i.display_order ASC"""
    )
    return jsonify({'images': images}) if images is not None else (jsonify({'error': 'DB Error'}), 500)


# ── ARCHIVE (standalone images, not from archived projects) ───

@api_bp.route('/archive')
def get_archive():
    images = execute_query(
        """SELECT * FROM images
        WHERE status_id = 3
        ORDER BY display_order ASC"""
    )
    return jsonify({'images': images or []})


@api_bp.route('/archive', methods=['POST'])
@token_required
def upload_archive_image():
    file = request.files.get('file')
    if not file or not allowed_file(file.filename):
        return jsonify({'error': 'No file or invalid file type'}), 400

    base = secure_filename(os.path.splitext(file.filename)[0])
    if not base:
        base = str(uuid.uuid4())[:8]
    unique_id = uuid.uuid4().hex[:8]
    public_id = f"sasha-portfolio/{base}_archive_{unique_id}"

    try:
        result = upload_to_cloudinary(file.read(), public_id)
        img_url = result['secure_url']
        cloudinary_pid = result['public_id']

        # Get max display_order
        max_order = execute_query(
            "SELECT COALESCE(MAX(display_order), 0) as max_o FROM images WHERE status_id = 3",
            fetch_one=True
        )
        next_order = (max_order['max_o'] + 1) if max_order else 1

        new_id = execute_query(
            "INSERT INTO images (img_route, cloudinary_public_id, project_id, status_id, display_order) VALUES (%s, %s, NULL, 3, %s)",
            (img_url, cloudinary_pid, next_order)
        )

        return jsonify({
            'image': {'img_id': new_id, 'img_route': img_url, 'display_order': next_order}
        }), 201

    except Exception as e:
        current_app.logger.error(f"Error processing archive image: {e}")
        return jsonify({'error': str(e)}), 500


@api_bp.route('/archive/reorder', methods=['PUT'])
@token_required
def reorder_archive():
    data = request.get_json()
    items = data.get('items', [])
    for item in items:
        execute_query(
            "UPDATE images SET display_order = %s WHERE img_id = %s",
            (item.get('order', 0), item.get('img_id'))
        )
    return jsonify({'message': 'Orden actualizado'})


# ── SITE CONFIG ───────────────────────────────────────────────

@api_bp.route('/site-config')
def get_site_config():
    DEFAULT = {"name": "Sasha Gala", "description": "", "stack": "", "links": []}
    config = execute_query("SELECT * FROM site_config LIMIT 1", fetch_one=True)
    if not config:
        new_id = execute_query(
            "INSERT INTO site_config (config_data) VALUES (%s)",
            (json.dumps(DEFAULT),)
        )
        config = execute_query("SELECT * FROM site_config LIMIT 1", fetch_one=True)

    if not config:
        return jsonify({'config': {'id': 0, 'config_data': DEFAULT}})

    if config.get('config_data') and isinstance(config['config_data'], str):
        try:
            config['config_data'] = json.loads(config['config_data'])
        except json.JSONDecodeError:
            config['config_data'] = DEFAULT.copy()
    elif not config.get('config_data'):
        config['config_data'] = DEFAULT.copy()

    return jsonify({'config': config})


@api_bp.route('/site-config', methods=['PUT'])
@token_required
def update_site_config():
    data = request.get_json()
    config_str = json.dumps(data.get('config_data', {}))

    # Check if config row exists
    existing = execute_query("SELECT id FROM site_config LIMIT 1", fetch_one=True)
    if existing:
        result = execute_query(
            "UPDATE site_config SET config_data = %s WHERE id = %s",
            (config_str, existing['id'])
        )
    else:
        result = execute_query(
            "INSERT INTO site_config (config_data) VALUES (%s)",
            (config_str,)
        )

    if result is None:
        return jsonify({'error': 'DB Error'}), 500

    return jsonify({'message': 'Configuracion actualizada'})


# ── CREATE ──────────────────────────────────────────────────────

@api_bp.route('/add-project', methods=['POST'])
@token_required
def add_project():
    data = request.get_json()
    query = """
        INSERT INTO proyectos
        (project_name, project_description, project_stack, project_colaborators, status, project_type)
        VALUES (%s, %s, %s, %s, %s, %s)
    """
    params = (
        data.get('project_name'),
        data.get('project_description', ''),
        data.get('project_stack', ''),
        data.get('project_colaborators', ''),
        data.get('status', 'draft'),
        data.get('project_type', 'full'),
    )
    result = execute_query(query, params)
    if result is None:
        return jsonify({'error': 'DB Error'}), 500
    return jsonify({'message': 'Creado', 'project_id': result}), 201


# ── UPDATE ──────────────────────────────────────────────────────

@api_bp.route('/projects/<int:project_id>', methods=['PUT'])
@token_required
def update_project(project_id):
    data = request.get_json()
    layout_str = json.dumps(data.get('layout_json', {"sections": []}))

    query = """
        UPDATE proyectos SET
        project_name = %s,
        project_description = %s,
        project_stack = %s,
        project_colaborators = %s,
        project_type = %s,
        status = %s,
        layout_json = %s
        WHERE project_id = %s
    """
    params = (
        data.get('project_name'),
        data.get('project_description', ''),
        data.get('project_stack', ''),
        data.get('project_colaborators', ''),
        data.get('project_type', 'full'),
        data.get('status', 'draft'),
        layout_str,
        project_id
    )
    result = execute_query(query, params)
    if result is None:
        return jsonify({'error': 'DB Error'}), 500

    updated = execute_query(
        "SELECT * FROM proyectos WHERE project_id = %s",
        (project_id,), fetch_one=True
    )
    if updated:
        parse_layout_json(updated)

    return jsonify({'message': 'Proyecto actualizado', 'project': updated})


# ── DELETE ──────────────────────────────────────────────────────

@api_bp.route('/projects/<int:project_id>', methods=['DELETE'])
@token_required
def delete_project(project_id):
    images = execute_query(
        "SELECT img_route, cloudinary_public_id FROM images WHERE project_id = %s",
        (project_id,)
    )

    result = execute_query(
        "DELETE FROM proyectos WHERE project_id = %s",
        (project_id,)
    )
    if result is None:
        return jsonify({'error': 'DB Error'}), 500

    if images:
        for img in images:
            pid = img.get('cloudinary_public_id')
            if pid:
                delete_from_cloudinary(pid)

    return jsonify({'message': 'Eliminado'})


# ── UPLOAD ──────────────────────────────────────────────────────

@api_bp.route('/upload', methods=['POST'])
@token_required
def upload_file():
    file = request.files.get('file')
    project_id = request.form.get('project_id')

    if not file or not allowed_file(file.filename):
        return jsonify({'error': 'No file or invalid file type'}), 400

    base = secure_filename(os.path.splitext(file.filename)[0])
    if not base:
        base = str(uuid.uuid4())[:8]
    unique_id = uuid.uuid4().hex[:8]
    public_id = f"sasha-portfolio/{base}_{project_id}_{unique_id}"

    try:
        result = upload_to_cloudinary(file.read(), public_id)
        img_url = result['secure_url']
        cloudinary_pid = result['public_id']

        new_id = execute_query(
            "INSERT INTO images (img_route, cloudinary_public_id, project_id, status_id) VALUES (%s, %s, %s, 1)",
            (img_url, cloudinary_pid, project_id)
        )

        return jsonify({
            'image': {
                'img_id': new_id,
                'img_route': img_url
            }
        }), 201

    except Exception as e:
        current_app.logger.error(f"Error processing image: {e}")
        return jsonify({'error': str(e)}), 500


# ── DELETE IMAGE ──────────────────────────────────────────────

@api_bp.route('/images/<int:img_id>', methods=['DELETE'])
@token_required
def delete_image(img_id):
    img = execute_query(
        "SELECT img_route, cloudinary_public_id FROM images WHERE img_id = %s",
        (img_id,), fetch_one=True
    )
    if not img:
        return jsonify({'error': 'Not found'}), 404

    result = execute_query("DELETE FROM images WHERE img_id = %s", (img_id,))
    if result is None:
        return jsonify({'error': 'DB Error'}), 500

    pid = img.get('cloudinary_public_id')
    if pid:
        delete_from_cloudinary(pid)

    return jsonify({'message': 'Imagen eliminada'})
