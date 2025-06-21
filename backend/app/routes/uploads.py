from flask import Blueprint, send_from_directory
import os

uploads_bp = Blueprint('uploads', __name__, url_prefix='/uploads')
 
@uploads_bp.route('/<path:filename>')
def serve_upload(filename):
    """Serves an uploaded file from the UPLOAD_FOLDER."""
    upload_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'uploads'))
    return send_from_directory(upload_dir, filename) 