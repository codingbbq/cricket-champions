export interface Player {
  id: string;
  name: string;
  role: 'batsman' | 'bowler' | 'all-rounder' | 'wicket-keeper';
  photoUrl?: string;
  active: boolean;
  createdAt: any; // Using 'any' for now, will be a Firestore Timestamp
}

export interface Team {
  id: string;
  name: string;
  players: string[]; // Array of player IDs
}

export interface Ball {
  ballNumber: number;
  bowlerId: string;
  strikerId: string;
  runs: number;
  isExtra: boolean;
  extraType?: 'wide' | 'no-ball';
  isWicket: boolean;
  wicketType?: string;
}

export interface Innings {
  id: string;
  teamId: string;
  score: number;
  wickets: number;
  overs: number;
  balls: Ball[];
}

export interface TeamInMatch {
  name: string;
  players: string[];
}

export interface Match {
  id: string;
  venue: string;
  teams?: {
    teamA: TeamInMatch;
    teamB: TeamInMatch;
  };
  teamA?: string; // Team ID for first team
  teamB?: string; // Team ID for second team
  date: any; // Firestore Timestamp
  overs: number;
  lastManBatting: boolean;
  status: 'pending' | 'live' | 'completed';
  createdAt: any; // or firebase.firestore.Timestamp
  toss?: {
    winnerId: string; // Will be 'teamA' or 'teamB'
    choice: 'bat' | 'bowl';
  };
  innings?: Innings[];
}
