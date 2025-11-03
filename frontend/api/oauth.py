# Vercel Python Serverless Function for Google OAuth User Profile Creation
# Endpoint: /api/oauth

import json
import os
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs
from google.oauth2 import id_token
from google.auth.transport import requests

class handler(BaseHTTPRequestHandler):
    def _send_response(self, status_code, body):
        """Helper method to send JSON responses"""
        payload = json.dumps(body).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS, GET")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Credentials", "true")
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS, GET")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Credentials", "true")
        self.end_headers()

    def do_POST(self):
        """Handle Google OAuth token and create user profile"""
        try:
            # Get Google OAuth Client ID from environment
            GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
            
            if not GOOGLE_CLIENT_ID:
                self._send_response(500, {
                    "error": "Server configuration error",
                    "message": "Google Client ID not configured"
                })
                return

            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            
            try:
                data = json.loads(body)
            except json.JSONDecodeError:
                self._send_response(400, {
                    "error": "Invalid JSON",
                    "message": "Request body must be valid JSON"
                })
                return

            # Get the ID token from request
            token = data.get('token') or data.get('credential')
            
            if not token:
                self._send_response(400, {
                    "error": "Missing token",
                    "message": "Google OAuth token is required"
                })
                return

            # Verify the Google OAuth token
            try:
                idinfo = id_token.verify_oauth2_token(
                    token, 
                    requests.Request(), 
                    GOOGLE_CLIENT_ID
                )
            except ValueError as e:
                self._send_response(401, {
                    "error": "Invalid token",
                    "message": f"Token verification failed: {str(e)}"
                })
                return

            # Extract user information from verified token
            user_profile = {
                "id": idinfo.get("sub"),
                "email": idinfo.get("email"),
                "email_verified": idinfo.get("email_verified"),
                "name": idinfo.get("name"),
                "given_name": idinfo.get("given_name"),
                "family_name": idinfo.get("family_name"),
                "picture": idinfo.get("picture"),
                "locale": idinfo.get("locale"),
            }

            # Here you would typically save the user to a database
            # For now, we'll return the user profile
            
            self._send_response(200, {
                "success": True,
                "message": "User profile created successfully",
                "user": user_profile
            })

        except Exception as e:
            self._send_response(500, {
                "error": "Internal server error",
                "message": str(e)
            })

    def do_GET(self):
        """Return API information"""
        self._send_response(200, {
            "endpoint": "/api/oauth",
            "description": "Google OAuth User Profile Creation",
            "methods": ["POST"],
            "required_env": ["GOOGLE_CLIENT_ID"],
            "request_body": {
                "token": "Google OAuth ID token (required)"
            }
        })
