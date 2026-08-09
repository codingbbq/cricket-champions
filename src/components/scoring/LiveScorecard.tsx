import type { Innings, Player } from '@/types';

interface LiveScorecardProps {
  innings: Innings;
  battingTeamName: string;
  striker?: Player | null;
  nonStriker?: Player | null;
  bowler?: Player | null;
}

export const LiveScorecard = ({ innings, battingTeamName, striker, nonStriker, bowler }: LiveScorecardProps) => {
  const overs = Math.floor(innings.balls.filter(b => !b.isExtra || b.extraType === 'no-ball').length / 6);
  const balls = innings.balls.filter(b => !b.isExtra || b.extraType === 'no-ball').length % 6;

  return (
    <div className="p-4 border rounded-lg space-y-4">
      <div className="text-center">
        <h3 className="text-2xl font-bold">{battingTeamName}</h3>
        <p className="text-4xl font-bold">{innings.score} - {innings.wickets}</p>
        <p className="text-lg text-muted-foreground">({overs}.{balls} Overs)</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold">On Strike</h4>
          <p>{striker?.name || 'N/A'}</p>
        </div>
        <div>
          <h4 className="font-semibold">Non-Striker</h4>
          <p>{nonStriker?.name || 'N/A'}</p>
        </div>
      </div>
      <div>
        <h4 className="font-semibold">Bowler</h4>
        <p>{bowler?.name || 'N/A'}</p>
      </div>
    </div>
  );
};
