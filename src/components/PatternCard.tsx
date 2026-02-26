import { TrendingUp } from 'lucide-react';
import type { DayEntry } from '@/hooks/useVYRStore';

interface PatternCardProps {
  historyByDay: DayEntry[];
}

function detectPatterns(days: DayEntry[]): string[] {
  if (days.length < 7) return [];
  const patterns: string[] = [];

  // Pattern 1: Weekday vs weekend clarity difference
  const weekdays = days.filter((d) => {
    const dow = new Date(d.day + 'T12:00:00').getDay();
    return dow >= 1 && dow <= 5;
  });
  const weekends = days.filter((d) => {
    const dow = new Date(d.day + 'T12:00:00').getDay();
    return dow === 0 || dow === 6;
  });
  if (weekdays.length > 0 && weekends.length > 0) {
    const avgWd = weekdays.reduce((s, d) => s + d.pillars.clareza, 0) / weekdays.length;
    const avgWe = weekends.reduce((s, d) => s + d.pillars.clareza, 0) / weekends.length;
    if (Math.abs(avgWd - avgWe) >= 0.8) {
      patterns.push(
        avgWd > avgWe
          ? 'Clareza cognitiva tende a ser maior em dias úteis.'
          : 'Clareza cognitiva tende a ser maior nos finais de semana.'
      );
    }
  }

  // Pattern 2: Score trend
  if (days.length >= 7) {
    const recent = days.slice(0, 3);
    const older = days.slice(4, 7);
    const recentAvg = recent.reduce((s, d) => s + d.score, 0) / recent.length;
    const olderAvg = older.reduce((s, d) => s + d.score, 0) / older.length;
    if (recentAvg - olderAvg > 5) {
      patterns.push('Tendência de melhora no score nos últimos dias.');
    } else if (olderAvg - recentAvg > 5) {
      patterns.push('Score apresentou queda nos últimos dias. Observe recuperação.');
    }
  }

  // Pattern 3: Energy-stability correlation
  const lowEnergyDays = days.filter((d) => d.pillars.energia < 3);
  if (lowEnergyDays.length > 0) {
    const lowEstab = lowEnergyDays.filter((d) => d.pillars.estabilidade < 3);
    if (lowEstab.length / lowEnergyDays.length > 0.5) {
      patterns.push('Energia baixa correlaciona com instabilidade emocional.');
    }
  }

  // Pattern 4: Consistency
  const scores = days.map((d) => d.score);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const std = Math.sqrt(scores.reduce((s, v) => s + (v - mean) ** 2, 0) / scores.length);
  if (std < 5 && mean >= 65) {
    patterns.push('Boa consistência no score — sistema estável.');
  }

  return patterns.slice(0, 4);
}

const PatternCard = ({ historyByDay }: PatternCardProps) => {
  const patterns = detectPatterns(historyByDay);

  if (patterns.length === 0) return null;

  const period = historyByDay.length >= 7
    ? `${historyByDay.length} dias analisados`
    : 'Mínimo 7 dias necessários';

  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-primary" />
          <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
            Padrões detectados
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">{period}</span>
      </div>
      <div className="space-y-2">
        {patterns.map((p, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'hsl(var(--vyr-accent-action))' }} />
            <span className="text-sm text-secondary-foreground">{p}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PatternCard;
