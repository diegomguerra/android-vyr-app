import MiniScoreRing from './MiniScoreRing';

interface CognitivePerformanceCardProps {
  score: number;
  level: string;
  limitingFactor: string;
}

const CognitivePerformanceCard = ({ score, level, limitingFactor }: CognitivePerformanceCardProps) => {
  return (
    <div className="rounded-2xl bg-card border border-border p-4 flex items-center gap-4">
      <MiniScoreRing score={score} size={48} />
      <div>
        <h3 className="text-sm font-medium text-foreground">{level}</h3>
        <p className="text-xs text-muted-foreground">Limitante: {limitingFactor}</p>
      </div>
    </div>
  );
};

export default CognitivePerformanceCard;
