export interface Player {
  id: string;
  name: string;
  role: 'batsman' | 'bowler' | 'all-rounder' | 'wicket-keeper';
  photoUrl?: string;
  active: boolean;
  createdAt: any; // Using 'any' for now, will be a Firestore Timestamp
}

export interface Match {
  id: string;
  venue: string;
  date: any; // Firestore Timestamp
  overs: number;
  lastManBatting: boolean;
  status: 'pending' | 'live' | 'completed';
  createdAt: any; // Firestore Timestamp
}
