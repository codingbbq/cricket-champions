import type { Ball } from '@/types';

interface RecentOverProps {
  balls: Ball[];
}

const BallDisplay = ({ ball }: { ball: Ball }) => {
  let text = String(ball.runs);
  if (ball.isWicket) text = 'W';
  if (ball.isExtra) {
    if (ball.extraType === 'wide') text = 'Wd';
    if (ball.extraType === 'no-ball') text = 'Nb';
  }

  return (
    <div className={`flex items-center justify-center h-8 w-8 rounded-full ${ball.isWicket ? 'bg-red-500 text-white' : 'bg-gray-200'}`}>
      {text}
    </div>
  );
};

export const RecentOver = ({ balls }: RecentOverProps) => {
  const validBalls = balls.filter(b => !b.isExtra || b.extraType === 'no-ball');
  const lastOverStart = Math.max(0, validBalls.length - 6);
  const lastOverBalls = balls.slice(lastOverStart);

  return (
    <div>
      <h4 className="font-semibold mb-2">This Over</h4>
      <div className="flex space-x-2">
        {lastOverBalls.map((ball, index) => (
          <BallDisplay key={index} ball={ball} />
        ))}
      </div>
    </div>
  );
};
