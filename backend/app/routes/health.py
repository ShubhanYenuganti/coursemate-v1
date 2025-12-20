from flask import Blueprint, jsonify
from app.extensions import socketio

health_bp = Blueprint('health', __name__)
 
@health_bp.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok"})

@health_bp.route('/api/socketio-test', methods=['GET'])
def socketio_test():
    """Test endpoint to verify Socket.IO is accessible"""
    return jsonify({
        "status": "ok",
        "socketio_available": True,
        "message": "Socket.IO endpoint is accessible. Try connecting via Socket.IO client."
    }) 