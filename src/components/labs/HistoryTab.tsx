import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, ChevronDown } from 'lucide-react';
import MiniScoreRing from '@/components/MiniScoreRing';
import EvolutionChart from '@/components/EvolutionChart';
import PatternCard from '@/components/PatternCard';
import { useVYRStore } from '@/hooks/useVYRStore';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getLocalToday } from '@/lib/date-utils';

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

const phaseLabels: Record<string, string> = { BOOT: 'BOOT', HOLD: 'HOLD', CLEAR: 'CLEAR' };
const phaseColors: Record<string, string> = { BOOT: '#556B8A', HOLD: '#8F7A4A', CLEAR: '#4F6F64' };

interface PhasePerception {
  day: string;
  phase: string;
  values: { foco: number; clareza: number; energia: number; estabilidade: number };
}

const HistoryTab = () => {
  const { historyByDay } = useVYRStore();
  const { session } = useAuth();
  const [phasePerceptions, setPhasePerceptions] = useState<PhasePerception[]>([]);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  // Load perception action_logs for all history days
  useEffect(() => {
    if (!session?.user?.id || historyByDay.length === 0) return;
    const days = historyByDay.map((d) => d.day);
    supabase.from('action_logs')
      .select('day, action_type, payload')
      .eq('user_id', session.user.id)
      .in('day', days)
      .like('action_type', 'perception_%')
      .then(({ data }) => {
        if (!data) return;
        const perceptions: PhasePerception[] = data.map((row: any) => ({
          day: row.day,
          phase: row.action_type.replace('perception_', ''),
          values: row.payload?.values ?? { foco: 0, clareza: 0, energia: 0, estabilidade: 0 },
        }));
        setPhasePerceptions(perceptions);
      });
  }, [session?.user?.id, historyByDay]);

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

  const today = getLocalToday();

  const getPhasePerceptionsForDay = (day: string) =>
    phasePerceptions.filter((p) => p.day === day);

  return (
    <div className="space-y-4">
      <EvolutionChart data={chartData} />
      <PatternCard historyByDay={historyByDay} />

      <div className="space-y-3">
        {historyByDay.map((d, i) => {
          const isToday = d.day === today;
          const prevScore = i < historyByDay.length - 1 ? historyByDay[i + 1].score : null;
          const delta = prevScore != null ? d.score - prevScore : 0;
          const dayPerceptions = getPhasePerceptionsForDay(d.day);
          const hasPerceptions = dayPerceptions.length > 0;
          const isExpanded = expandedDay === d.day;

          return (
            <div key={d.day}>
              <div
                className={`rounded-2xl bg-card p-4 flex items-center gap-4 ${hasPerceptions ? 'cursor-pointer' : ''}`}
                style={isToday ? { border: '1px solid hsl(var(--vyr-accent-action) / 0.2)' } : { border: '1px solid hsl(var(--border))' }}
                onClick={() => hasPerceptions && setExpandedDay(isExpanded ? null : d.day)}
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
                  {hasPerceptions && (
                    <div className="flex gap-1 mt-1">
                      {['BOOT', 'HOLD', 'CLEAR'].map((phase) => {
                        const has = dayPerceptions.some((p) => p.phase === phase);
                        return (
                          <span
                            key={phase}
                            className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                            style={has ? { background: `${phaseColors[phase]}33`, color: phaseColors[phase] } : { background: 'transparent', color: 'var(--muted-foreground)', opacity: 0.4 }}
                          >
                            {phase}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {delta !== 0 && (
                    delta > 0 ? (
                      <TrendingUp size={12} className="text-vyr-positive" />
                    ) : (
                      <TrendingDown size={12} className="text-vyr-caution" />
                    )
                  )}
                  {hasPerceptions && (
                    <ChevronDown size={14} className={`text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  )}
                </div>
              </div>

              {/* Phase breakdown */}
              {isExpanded && hasPerceptions && (
                <div className="mt-1 ml-4 mr-2 space-y-1">
                  {dayPerceptions.map((p) => (
                    <div
                      key={p.phase}
                      className="flex items-center justify-between rounded-xl bg-muted/30 px-3 py-2"
                    >
                      <span className="text-xs font-medium" style={{ color: phaseColors[p.phase] }}>
                        {phaseLabels[p.phase] || p.phase}
                      </span>
                      <div className="flex items-center gap-3 text-[11px] text-secondary-foreground">
                        <span>F:{p.values.foco}</span>
                        <span>C:{p.values.clareza}</span>
                        <span>E:{p.values.energia}</span>
                        <span>Es:{p.values.estabilidade}</span>
                      </div>
                    </div>
                  ))}
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
