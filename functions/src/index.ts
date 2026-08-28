import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

interface CreatePlayerAccountData {
  email: string;
  password: string;
  playerId: string;
  playerName: string;
}

export const createPlayerAccount = functions.https.onCall(async (request) => {
  // Check if caller is super-admin
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const callerUid = request.auth.uid;
  const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
  const callerRole = callerDoc.data()?.role;

  if (callerRole !== 'super-admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only super-admins can create accounts');
  }

  const { email, password, playerId, playerName } = request.data as CreatePlayerAccountData;

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