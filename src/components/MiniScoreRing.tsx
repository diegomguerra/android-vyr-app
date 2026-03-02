import { getScoreColor } from '@/lib/vyr-score-color';

interface MiniScoreRingProps {
  score: number;
  size?: number;
}

const MiniScoreRing = ({ score, size = 36 }: MiniScoreRingProps) => {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="hsl(var(--border))"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-foreground text-sm font-medium"
        transform={`rotate(90, ${size / 2}, ${size / 2})`}
      >
        {score}
      </text>
    </svg>
  );
};

export default MiniScoreRing;
