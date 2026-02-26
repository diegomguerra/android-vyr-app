import { useEffect, useRef } from 'react';

interface StateRingProps {
  score: number;
  stateLabel: string;
  level: string;
}

const StateRing = ({ score, stateLabel, level }: StateRingProps) => {
  const circleRef = useRef<SVGCircleElement>(null);
  const size = 220;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcFraction = 0.75; // 270 degrees
  const arcLength = circumference * arcFraction;
  const progress = (score / 100) * arcLength;
  const dashOffset = arcLength - progress;

  useEffect(() => {
    const circle = circleRef.current;
    if (!circle) return;
    circle.style.setProperty('--ring-circumference', `${arcLength}`);
    circle.style.setProperty('--ring-target', `${dashOffset}`);
    circle.style.strokeDashoffset = `${arcLength}`;
    requestAnimationFrame(() => {
      circle.style.transition = 'stroke-dashoffset 1200ms cubic-bezier(0.4, 0, 0.2, 1)';
      circle.style.strokeDashoffset = `${dashOffset}`;
    });
  }, [score, arcLength, dashOffset]);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform"
        style={{ transform: 'rotate(-225deg)' }}
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--vyr-stroke-divider) / 0.4)"
          strokeWidth={stroke}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
        />
        {/* Progress */}
        <circle
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--vyr-accent-action))"
          strokeWidth={stroke}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 12px hsl(var(--vyr-accent-action) / 0.5))' }}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] uppercase tracking-[0.2em] text-vyr-text-muted font-medium">
          VYR STATE
        </span>
        <span className="text-6xl font-medium tabular-nums text-vyr-text-primary leading-none mt-1">
          {score}
        </span>
        <span className="text-sm text-vyr-text-secondary mt-1">
          {stateLabel}
        </span>
        <span className="text-[10px] uppercase tracking-[0.15em] text-vyr-text-muted mt-1">
          {level}
        </span>
      </div>
    </div>
  );
};

export default StateRing;
