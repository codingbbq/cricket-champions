import type { Ball } from '@/types';

interface BallCommentaryProps {
  ball: Ball;
  overNumber: number;
  ballInOver: number;
  playersMap?: Map<string, string>;
}

export const BallCommentary = ({ ball, overNumber, ballInOver, playersMap }: BallCommentaryProps) => {
  const getPlayerName = (playerId: string, storedName?: string): string => {
    // Use stored name first, then try to look up from map, then fallback to Unknown
    if (storedName) return storedName;
    if (playersMap && playersMap.has(playerId)) return playersMap.get(playerId) || 'Unknown';
    return 'Unknown';
  };

  const getCommentaryEmoji = (): string => {
    // Return emoji based on ball type
    if (ball.isWicket) return '💥';
    if (ball.runs === 6) return '🚀';
    if (ball.runs === 4) return '🎯';
    if (ball.isExtra) return '⚠️';
    if (ball.runs === 0) return '⚪';
    return '🏏';
  };

  const getCommentaryText = (): { overBall: string; text: string } => {
    const strikerName = getPlayerName(ball.strikerId, ball.strikerName);
    const bowlerName = getPlayerName(ball.bowlerId, ball.bowlerName);
    const overBall = `${overNumber}.${ballInOver}`;
    
    let text = '';
    
    // Handle wickets
    if (ball.isWicket) {
      if (ball.wicketType === 'caught') {
        const fielderName = ball.fielderId ? getPlayerName(ball.fielderId, ball.fielderName) : 'fielder';
        text = `${strikerName} caught by ${fielderName}, bowled by ${bowlerName}! WICKET!`;
      } else if (ball.wicketType === 'bowled') {
        text = `${strikerName} bowled by ${bowlerName}! WICKET!`;
      } else if (ball.wicketType === 'lbw') {
        text = `${strikerName} LBW by ${bowlerName}! WICKET!`;
      } else {
        text = `${strikerName} out, bowled by ${bowlerName}! WICKET!`;
      }
      return { overBall, text };
    }

    // Handle extras
    if (ball.isExtra) {
      if (ball.extraType === 'wide') {
        text = `Wide ball by ${bowlerName}! +1 run`;
      } else if (ball.extraType === 'no-ball') {
        const extraRuns = ball.runs + 1;
        text = `No ball by ${bowlerName}! +${extraRuns} runs`;
      }
      return { overBall, text };
    }

    // Handle regular balls
    if (ball.runs === 0) {
      text = `${strikerName} played a dot ball`;
    } else if (ball.runs === 1) {
      text = `${strikerName} scored 1 run`;
    } else if (ball.runs === 2) {
      text = `${strikerName} scored 2 runs`;
    } else if (ball.runs === 3) {
      text = `${strikerName} scored 3 runs`;
    } else if (ball.runs === 4) {
      text = `${strikerName} hit a FOUR!`;
    } else if (ball.runs === 6) {
      text = `${strikerName} hit a SIXER!`;
    } else {
      text = `${strikerName} scored ${ball.runs} runs`;
    }

    return { overBall, text };
  };

  const formatTime = (timestamp?: any): string => {
    if (!timestamp) return '';
    
    // Handle Firestore Timestamp object
    let date: Date;
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      return '';
    }
    
    return date.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit', 
      hour12: true 
    });
  };

  const { overBall, text } = getCommentaryText();
  const commentaryEmoji = getCommentaryEmoji();
  const timeString = formatTime(ball.timestamp);

  return (
    <div className="text-sm text-neutral-300 py-1">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-base flex-shrink-0">{commentaryEmoji}</span>
          <span className="font-semibold text-amber-400">{overBall}</span>
          <span className="flex-1">{text}</span>
        </div>
        {timeString && (
          <span className="text-xs text-neutral-600 whitespace-nowrap">{timeString}</span>
        )}
      </div>
    </div>
  );
};
