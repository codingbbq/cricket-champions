# Firebase Account Creation Setup Guide

This guide explains how to set up Firebase Admin SDK to create user accounts for players from your application.

## Overview

The application allows super-admins to create Firebase Authentication accounts for players. Since Firebase client SDK doesn't allow creating accounts for other users (security restriction), you need to use Firebase Admin SDK on a backend server.

## Architecture

```
Frontend (React) → Backend API → Firebase Admin SDK → Firebase Auth
```

## Setup Options

### Option 1: Firebase Cloud Functions (Recommended)

#### Step 1: Install Firebase Tools
```bash
npm install -g firebase-tools
firebase login
firebase init functions
```

#### Step 2: Create Cloud Function

Create `functions/src/index.ts`:

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const createPlayerAccount = functions.https.onCall(async (data, context) => {
  // Check if caller is super-admin
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const callerUid = context.auth.uid;
  const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
  const callerRole = callerDoc.data()?.role;

  if (callerRole !== 'super-admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only super-admins can create accounts');
  }

  const { email, password, playerId, playerName } = data;

  try {
    // Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: playerName,
    });

    // Update player document with uid and email
    await admin.firestore().collection('players').doc(playerId).update({
      uid: userRecord.uid,
      email: email,
    });

    // Create user profile document
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: email,
      role: 'user',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { 
      success: true, 
      uid: userRecord.uid,
      message: 'Account created successfully' 
    };
  } catch (error: any) {
    console.error('Error creating account:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
```

#### Step 3: Deploy Function
```bash
cd functions
npm install
firebase deploy --only functions
```

#### Step 4: Update Frontend

Update the account creation button in `PlayersPage.tsx`:

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

// In your component
const functions = getFunctions();
const createPlayerAccount = httpsCallable(functions, 'createPlayerAccount');

// In the button onClick handler
const result = await createPlayerAccount({
  email: accountEmail,
  password: accountPassword,
  playerId: selectedPlayerForAccount.id,
  playerName: selectedPlayerForAccount.name,
});

if (result.data.success) {
  addToast('Account created successfully!', 'success');
  // Refresh players list
}
```

---

### Option 2: Custom Backend Server (Node.js/Express)

#### Step 1: Create Backend Server

```bash
mkdir cricket-backend
cd cricket-backend
npm init -y
npm install express firebase-admin cors dotenv
```

#### Step 2: Setup Firebase Admin

Create `server.js`:

```javascript
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
require('dotenv').config();

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
app.use(cors());
app.use(express.json());

// Middleware to verify super-admin
async function verifySuperAdmin(req, res, next) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();
    
    if (userDoc.data()?.role !== 'super-admin') {
      return res.status(403).json({ error: 'Forbidden: Super-admin access required' });
    }
    
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Create player account endpoint
app.post('/api/create-player-account', verifySuperAdmin, async (req, res) => {
  const { email, password, playerId, playerName } = req.body;

  try {
    // Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: playerName,
    });

    // Update player document
    await admin.firestore().collection('players').doc(playerId).update({
      uid: userRecord.uid,
      email: email,
    });

    // Create user profile
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: email,
      role: 'user',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ 
      success: true, 
      uid: userRecord.uid,
      message: 'Account created successfully' 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

#### Step 3: Get Service Account Key

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Save as `serviceAccountKey.json` in your backend folder
4. **IMPORTANT**: Add `serviceAccountKey.json` to `.gitignore`

#### Step 4: Update Frontend

```typescript
// In PlayersPage.tsx
const response = await fetch('http://localhost:3001/api/create-player-account', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${await currentUser.getIdToken()}`,
  },
  body: JSON.stringify({
    email: accountEmail,
    password: accountPassword,
    playerId: selectedPlayerForAccount.id,
    playerName: selectedPlayerForAccount.name,
  }),
});

const result = await response.json();
if (result.success) {
  addToast('Account created successfully!', 'success');
}
```

---

## Security Considerations

1. **Never expose service account keys** in client-side code
2. **Always verify** the caller is a super-admin before creating accounts
3. **Use HTTPS** in production
4. **Rate limit** account creation endpoints
5. **Log** all account creation attempts for audit

## Testing

### Manual Testing (Firebase Console)

For development/testing, you can manually create accounts:

1. Go to Firebase Console → Authentication → Users
2. Click "Add User"
3. Enter email and password
4. Copy the UID
5. Manually update the player document in Firestore:
   ```
   players/{playerId}
   - uid: "copied-uid"
   - email: "player@example.com"
   ```
6. Create user profile document:
   ```
   users/{uid}
   - uid: "copied-uid"
   - email: "player@example.com"
   - role: "user"
   - createdAt: [timestamp]
   ```

## Environment Variables

Create `.env` file in your backend:

```
PORT=3001
FIREBASE_PROJECT_ID=your-project-id
```

## Deployment

### Cloud Functions
```bash
firebase deploy --only functions
```

### Backend Server (Example: Heroku)
```bash
heroku create cricket-champions-api
git push heroku main
```

## Troubleshooting

### Error: "Insufficient permissions"
- Ensure service account has proper permissions
- Check Firebase Admin SDK initialization

### Error: "Email already exists"
- The email is already registered in Firebase Auth
- Use a different email or delete the existing account

### Error: "CORS blocked"
- Add proper CORS configuration in backend
- Ensure frontend URL is whitelisted

## Next Steps

1. Choose Option 1 (Cloud Functions) or Option 2 (Backend Server)
2. Follow setup instructions
3. Update frontend code to call your backend
4. Test account creation with a test player
5. Deploy to production

## Support

For more information:
- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Cloud Functions Documentation](https://firebase.google.com/docs/functions)
