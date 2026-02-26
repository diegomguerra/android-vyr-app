import { useEffect, useRef } from 'react';

interface PillarRingProps {
  value: number; // 0-5
  label: string;
  colorVar: string; // CSS var name like --vyr-energia
  index: number;
}

const PillarRing = ({ value, label, colorVar, index }: PillarRingProps) => {
  const circleRef = useRef<SVGCircleElement>(null);
  const size = 64;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcFraction = 0.75;
  const arcLength = circumference * arcFraction;
  const progress = (value / 5) * arcLength;
  const dashOffset = arcLength - progress;

  useEffect(() => {
    const circle = circleRef.current;
    if (!circle) return;
    circle.style.strokeDashoffset = `${arcLength}`;
    const delay = 300 + index * 100;
    setTimeout(() => {
      circle.style.transition = 'stroke-dashoffset 800ms cubic-bezier(0.4, 0, 0.2, 1)';
      circle.style.strokeDashoffset = `${dashOffset}`;
    }, delay);
  }, [value, arcLength, dashOffset, index]);

  return (
    <div className="flex flex-col items-center gap-1.5" style={{ animation: `slide-up 200ms ease-out ${300 + index * 100}ms both` }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-225deg)' }}>
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="hsl(var(--vyr-stroke-divider) / 0.4)"
            strokeWidth={stroke} strokeDasharray={`${arcLength} ${circumference}`} strokeLinecap="round"
          />
          <circle
            ref={circleRef}
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={`hsl(var(${colorVar}))`}
            strokeWidth={stroke} strokeDasharray={`${arcLength} ${circumference}`} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px hsl(var(${colorVar}) / 0.4))` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-medium tabular-nums" style={{ color: `hsl(var(${colorVar}))` }}>
            {value.toFixed(1)}
          </span>
        </div>
      </div>
      <span className="text-[10px] uppercase tracking-[0.15em] text-vyr-text-muted font-medium">
        {label}
      </span>
    </div>
  );
};

export default PillarRing;
