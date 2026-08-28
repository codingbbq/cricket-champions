const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
// You'll need to download the service account key from Firebase Console
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

// Middleware to verify Firebase Auth token
async function verifyAuth(req, res, next) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
}

// Middleware to verify super-admin role
async function verifySuperAdmin(req, res, next) {
  try {
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      console.error(`User document not found for UID: ${req.user.uid}`);
      return res.status(403).json({ error: 'User profile not found' });
    }
    
    const userRole = userDoc.data()?.role;
    console.log(`User ${req.user.uid} has role: ${userRole}`);
    
    if (userRole !== 'super-admin') {
      return res.status(403).json({ error: 'Forbidden: Super-admin access required' });
    }
    
    next();
  } catch (error) {
    console.error('Role verification error:', error.message);
    console.error('Error code:', error.code);
    console.error('Full error:', error);
    
    // If it's a permission error, it might be Firestore rules
    if (error.code === 7 || error.message.includes('PERMISSION_DENIED')) {
      return res.status(500).json({ 
        error: 'Firestore permission error. Please check Firestore security rules in Firebase Console.',
        details: 'The service account needs read access to the users collection.'
      });
    }
    
    return res.status(500).json({ error: 'Internal server error during role verification' });
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend server is running' });
});

// Create player account endpoint
app.post('/api/create-player-account', verifyAuth, verifySuperAdmin, async (req, res) => {
  const { email, password, playerId, playerName } = req.body;

  // Validate input
  if (!email || !password || !playerId || !playerName) {
    return res.status(400).json({ 
      error: 'Missing required fields: email, password, playerId, playerName' 
    });
  }

  try {
    console.log(`Creating account for player: ${playerName} (${email})`);

    // Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: playerName,
    });

    console.log(`Firebase Auth user created with UID: ${userRecord.uid}`);

    // Update player document with uid
    await admin.firestore().collection('players').doc(playerId).update({
      uid: userRecord.uid,
      email: email,
    });

    console.log(`Player document updated with UID`);

    // Create user profile document
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: email,
      role: 'user',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`User profile document created`);

    res.json({ 
      success: true, 
      uid: userRecord.uid,
      message: 'Account created successfully' 
    });
  } catch (error) {
    console.error('Error creating account:', error);
    
    // Handle specific Firebase errors
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ 
        error: 'Email already exists. Please use a different email.' 
      });
    }
    
    if (error.code === 'auth/invalid-email') {
      return res.status(400).json({ 
        error: 'Invalid email address.' 
      });
    }
    
    if (error.code === 'auth/weak-password') {
      return res.status(400).json({ 
        error: 'Password is too weak. Use at least 6 characters.' 
      });
    }

    res.status(500).json({ 
      error: error.message || 'Failed to create account' 
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Cricket Champions Backend Server');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Server running on: http://localhost:${PORT}`);
  console.log(`  Health check: http://localhost:${PORT}/health`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
});
