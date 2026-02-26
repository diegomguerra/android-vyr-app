import { TrendingUp, TrendingDown, Clock } from 'lucide-react';
import MiniScoreRing from '@/components/MiniScoreRing';
import EvolutionChart from '@/components/EvolutionChart';
import PatternCard from '@/components/PatternCard';
import { useVYRStore } from '@/hooks/useVYRStore';

function formatDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
}

function getDayNote(score: number): string {
  if (score >= 80) return 'Dia favorável, boa capacidade cognitiva.';
  if (score >= 65) return 'Dia consistente, sem quedas abruptas.';
  if (score >= 50) return 'Ajustes ao longo do dia.';
  return 'Dia de recuperação necessária.';
}

const weekdayShort = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const HistoryTab = () => {
  const { historyByDay } = useVYRStore();

  if (historyByDay.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Sem histórico disponível ainda.</p>
      </div>
    );
  }

  const chartData = [...historyByDay].reverse().map((d) => ({
    date: weekdayShort[new Date(d.day + 'T12:00:00').getDay()],
    score: d.score,
    fullDate: d.day,
  }));

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4">
      <EvolutionChart data={chartData} />
      <PatternCard historyByDay={historyByDay} />

      <div className="space-y-3">
        {historyByDay.map((d, i) => {
          const isToday = d.day === today;
          const prevScore = i < historyByDay.length - 1 ? historyByDay[i + 1].score : null;
          const delta = prevScore != null ? d.score - prevScore : 0;

          return (
            <div
              key={d.day}
              className="rounded-2xl bg-card p-4 flex items-center gap-4"
              style={isToday ? { border: '1px solid hsl(var(--vyr-accent-action) / 0.2)' } : { border: '1px solid hsl(var(--border))' }}
            >
              <MiniScoreRing score={d.score} size={48} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{formatDate(d.day)}</span>
                  {isToday && (
                    <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded text-primary bg-primary/10">Hoje</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{getDayNote(d.score)}</p>
              </div>
              {delta !== 0 && (
                <div className="flex items-center gap-0.5">
                  {delta > 0 ? (
                    <TrendingUp size={12} className="text-vyr-positive" />
                  ) : (
                    <TrendingDown size={12} className="text-vyr-caution" />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HistoryTab;
