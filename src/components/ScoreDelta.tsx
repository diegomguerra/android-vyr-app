import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ScoreDeltaProps {
  delta: number;
}

const ScoreDelta = ({ delta }: ScoreDeltaProps) => {
  return (
    <div className="flex items-center gap-1 animate-delta-pulse">
      {delta > 0 ? (
        <TrendingUp size={14} className="text-[hsl(var(--vyr-positive))]" />
      ) : delta < 0 ? (
        <TrendingDown size={14} className="text-[hsl(var(--vyr-caution))]" />
      ) : (
        <Minus size={14} className="text-muted-foreground" />
      )}
      <span className={`text-xs font-medium ${
        delta > 0 ? 'text-[hsl(var(--vyr-positive))]' :
        delta < 0 ? 'text-[hsl(var(--vyr-caution))]' :
        'text-muted-foreground'
      }`}>
        {delta > 0 ? '+' : ''}{delta} pts vs ontem
      </span>
    </div>
  );
};

export default ScoreDelta;
