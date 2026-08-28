# Cricket Champions Backend Server

Simple Node.js backend server for automating Firebase Authentication account creation.

## Setup Instructions

### 1. Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click the gear icon ⚙️ → **Project Settings**
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Save the downloaded JSON file as `serviceAccountKey.json` in this `backend` folder

⚠️ **IMPORTANT**: Never commit `serviceAccountKey.json` to Git! It's already in `.gitignore`.

### 2. Install Dependencies

```bash
cd backend
npm install
```

### 3. Create Environment File (Optional)

```bash
cp .env.example .env
```

You can change the port in `.env` if needed (default is 3001).

### 4. Start the Server

```bash
npm start
```

Or for development with auto-restart:

```bash
npm run dev
```

You should see:
```
═══════════════════════════════════════════════════════
  Cricket Champions Backend Server
═══════════════════════════════════════════════════════
  Server running on: http://localhost:3001
  Health check: http://localhost:3001/health
═══════════════════════════════════════════════════════
```

## Testing the Server

Open your browser and go to: http://localhost:3001/health

You should see:
```json
{
  "status": "ok",
  "message": "Backend server is running"
}
```

## How It Works

1. **Frontend**: When super-admin adds a player, the app sends a request to the backend
2. **Backend**: 
   - Verifies the user is authenticated
   - Verifies the user is a super-admin
   - Creates Firebase Auth account
   - Updates player document with UID
   - Creates user profile document
3. **Result**: Player can immediately log in with their credentials

## API Endpoints

### Health Check
- **URL**: `GET /health`
- **Auth**: None required
- **Response**: `{ status: "ok", message: "..." }`

### Create Player Account
- **URL**: `POST /api/create-player-account`
- **Auth**: Required (Firebase Auth token)
- **Role**: super-admin only
- **Body**:
  ```json
  {
    "email": "player@example.com",
    "password": "password123",
    "playerId": "firestore-player-id",
    "playerName": "Player Name"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "uid": "firebase-auth-uid",
    "message": "Account created successfully"
  }
  ```

## Troubleshooting

### Error: Cannot find module 'serviceAccountKey.json'
- Make sure you downloaded the service account key from Firebase Console
- Save it as `serviceAccountKey.json` in the `backend` folder

### Error: Port 3001 already in use
- Change the port in `.env` file
- Or stop the other process using port 3001

### Error: Unauthorized
- Make sure you're logged in as super-admin in the frontend
- Check that the Firebase Auth token is being sent correctly

### Error: Email already exists
- The email is already registered in Firebase Auth
- Use a different email or delete the existing user from Firebase Console

## Security Notes

- The server verifies Firebase Auth tokens
- Only super-admins can create accounts
- Service account key should never be committed to Git
- In production, use environment variables for sensitive data
- Consider adding rate limiting for production use

## Running in Production

For production deployment:

1. Use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start server.js --name cricket-backend
   ```

2. Set up environment variables properly
3. Use HTTPS
4. Add rate limiting
5. Set up proper logging
6. Consider using a cloud service (Heroku, Railway, etc.)
