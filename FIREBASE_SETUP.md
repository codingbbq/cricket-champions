# Firebase Setup Guide

## Issue: "Database '(default)' not found"

This error occurs when your Firestore database hasn't been created in Firebase Console.

## Steps to Fix:

### 1. Go to Firebase Console
- Visit https://console.firebase.google.com/
- Select your project (cricket-champions)

### 2. Create Firestore Database
- In the left sidebar, click **Firestore Database** (under Build section)
- Click **Create Database**
- Choose **Start in production mode** (or test mode if you're developing)
- Select your region (closest to you)
- Click **Create**

### 3. Create Collections
Once the database is created, you need to create two collections:

#### Collection 1: `players`
- Click **Start collection**
- Collection ID: `players`
- Click **Next**
- Click **Auto ID** to create the first document
- Add these fields:
  ```
  name: (string) "Sample Player"
  role: (string) "batsman"
  active: (boolean) true
  createdAt: (timestamp) current date/time
  ```
- Click **Save**

#### Collection 2: `matches`
- Click **Start collection**
- Collection ID: `matches`
- Click **Next**
- Click **Auto ID** to create the first document
- Add these fields:
  ```
  venue: (string) "Sample Ground"
  overs: (number) 20
  status: (string) "pending"
  date: (timestamp) current date/time
  createdAt: (timestamp) current date/time
  ```
- Click **Save**

### 4. Verify Your .env File
Make sure your `.env` file in the project root has all these variables:
```
VITE_API_KEY=your_api_key
VITE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_PROJECT_ID=your_project_id
VITE_STORAGE_BUCKET=your_project.appspot.com
VITE_MESSAGING_SENDER_ID=your_sender_id
VITE_APP_ID=your_app_id
VITE_MEASUREMENT_ID=your_measurement_id
```

Get these values from Firebase Console:
- Click the gear icon (Settings) → Project Settings
- Copy the values from the "Web" app configuration

### 5. Set Firestore Security Rules
This is **CRITICAL** - without proper security rules, you'll get "Missing or insufficient permissions" errors.

**For Development (Easy - allows all authenticated users):**
1. In Firebase Console, go to **Firestore Database**
2. Click the **Rules** tab
3. Replace the default rules with:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read and write all data
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```
4. Click **Publish**

**For Production (Secure - only allow specific operations):**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Players collection
    match /players/{document=**} {
      allow read: if request.auth != null;
      allow create, update, delete: if request.auth != null;
    }
    
    // Matches collection
    match /matches/{document=**} {
      allow read: if request.auth != null;
      allow create, update, delete: if request.auth != null;
    }
  }
}
```
5. Click **Publish**

### 6. Restart Dev Server
After setting security rules, restart your dev server:
```bash
pnpm run dev
```

## Testing
1. Go to http://localhost:5174/
2. Login with your admin credentials
3. Click "Manage Players" - it should now load players
4. Try adding a new player - it should work without permission errors

## Troubleshooting

**Error: "Missing or insufficient permissions"**
- Go to Firestore Database → Rules tab
- Make sure you published the security rules (step 5 above)
- Verify the rules allow `write` permission for authenticated users

**Error: "Loading players..." (infinite loading)**
1. Check browser console for errors
2. Verify Firebase config in `.env`
3. Make sure Firestore database exists
4. Check that security rules are published

**Error: "Failed to load players"**
- Check your internet connection
- Verify Firebase project is active
- Check Firestore security rules allow `read` permission

## Setting Up Match Subcollections (Teams & Innings)

The scoring page requires subcollections under each match document. These are created automatically by the app when you set up a match, but here's how to manually create them if needed:

### Teams Subcollection
When you create a match and select teams, the app automatically creates a `teams` subcollection under `matches/{matchId}/teams`.

Each team document should have:
```
id: (string) team ID
name: (string) "Team A"
players: (array) ["playerId1", "playerId2", ...]
```

### Innings Subcollection
When you start scoring, the app automatically creates an `innings` subcollection under `matches/{matchId}/innings`.

Each innings document should have:
```
id: (string) team ID (same as batting team)
teamId: (string) team ID
score: (number) 0
wickets: (number) 0
overs: (number) 0
balls: (array) []
```

### Updated Security Rules (with Subcollections)
Update your Firestore security rules to allow access to subcollections:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read and write all data
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

This rule allows authenticated users to access all collections and subcollections.

## Complete Match Setup Flow

To successfully use the scoring page:

1. **Create a Match** (`/admin/matches/new`)
   - Enter venue, overs, date
   - Match is created with `status: "pending"`

2. **Select Teams** (`/admin/matches/{matchId}/teams`)
   - Select two teams
   - Assign players to each team
   - Creates `matches/{matchId}/teams` subcollection

3. **Complete Toss** (`/admin/matches/{matchId}/toss`)
   - Select toss winner
   - Select batting/bowling choice
   - Updates match with `toss` data

4. **Start Scoring** (`/scoring/{matchId}`)
   - App loads match, teams, and players
   - Creates `matches/{matchId}/innings` subcollection
   - Ready to record balls and score

If you see "Teams not found" or "Match toss data not found" errors, go back and complete the previous steps in order.
