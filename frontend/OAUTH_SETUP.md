# Google OAuth Setup Instructions

## Prerequisites
- Google Cloud Console account
- Vercel account (for deployment)

## Setup Steps

### 1. Google Cloud Console Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API** or **Google Identity Services**
4. Navigate to **APIs & Services > Credentials**
5. Click **Create Credentials > OAuth 2.0 Client ID**
6. Configure the OAuth consent screen if prompted
7. Select **Web application** as the application type
8. Add authorized JavaScript origins:
   - `http://localhost:5173` (for local development)
   - Your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
9. Add authorized redirect URIs (optional, not required for JavaScript SDK)
10. Copy your **Client ID**

### 2. Local Development Setup

1. Create a `.env` file in the frontend directory:
   ```bash
   cp .env.example .env
   ```

2. Add your Google Client ID to `.env`:
   ```env
   VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### 3. Vercel Deployment Setup

1. In your Vercel project settings, add environment variables:
   - `VITE_GOOGLE_CLIENT_ID`: Your Google OAuth Client ID (for frontend)
   - `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID (for backend verification)

2. Deploy:
   ```bash
   vercel
   ```

## How It Works

1. **User clicks "Sign in with Google"**
   - Google's JavaScript SDK opens a popup/overlay
   - User selects their Google account and authorizes

2. **Google returns a credential (JWT token)**
   - The token is automatically passed to the callback function

3. **Frontend sends token to `/api/oauth`**
   - POST request with the credential

4. **Backend verifies the token**
   - Uses `google-auth` library to verify token authenticity
   - Extracts user profile information

5. **Frontend displays user credentials**
   - Shows the verified user profile as JSON
   - Displays user information in a formatted view

## API Endpoint

**POST `/api/oauth`**

Request:
```json
{
  "credential": "google-jwt-token-here"
}
```

Response:
```json
{
  "success": true,
  "message": "User profile created successfully",
  "user": {
    "id": "123456789",
    "email": "user@example.com",
    "email_verified": true,
    "name": "John Doe",
    "given_name": "John",
    "family_name": "Doe",
    "picture": "https://...",
    "locale": "en"
  }
}
```

## Troubleshooting

### "Client ID not configured" error
- Make sure `VITE_GOOGLE_CLIENT_ID` is set in your `.env` file
- Restart the development server after adding environment variables

### "Invalid token" error
- Ensure `GOOGLE_CLIENT_ID` is set in Vercel environment variables
- Make sure both client IDs match (frontend and backend)
- Check that your domain is authorized in Google Cloud Console

### Google Sign-In button doesn't appear
- Check browser console for errors
- Verify Google Sign-In library is loaded (check Network tab)
- Ensure the Client ID is valid

## Security Notes

- Never commit your `.env` file to version control
- Keep your Google Client Secret secure (not needed for this implementation)
- Always verify tokens on the backend
- Use HTTPS in production
