import { useState, useEffect } from 'react';
import { Info, Zap, Eye, Moon, Clock, Check, Lock, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useVYRStore } from '@/hooks/useVYRStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { recomputeStateWithPerceptions, computeDayMeanFromPhases } from '@/lib/vyr-recompute';
import { isPhaseActive, getPhaseTimeWindow } from '@/lib/vyr-engine';
import { getLocalToday } from '@/lib/date-utils';

const phases = [
  { key: 'BOOT', label: 'Boot', sub: '05h–11h59', icon: Zap },
  { key: 'HOLD', label: 'Hold', sub: '12h–17h59', icon: Eye },
  { key: 'CLEAR', label: 'Clear', sub: '18h–22h', icon: Moon },
] as const;

const sliders = [
  { key: 'foco', label: 'FOCO', desc: 'Como está sua capacidade de concentração?' },
  { key: 'clareza', label: 'CLAREZA', desc: 'Sua mente está clara ou confusa?' },
  { key: 'energia', label: 'ENERGIA', desc: 'Qual seu nível de energia física?' },
  { key: 'estabilidade', label: 'ESTABILIDADE', desc: 'Como está sua estabilidade emocional?' },
];

const phaseColors: Record<string, string> = {
  BOOT: '#556B8A',
  HOLD: '#8F7A4A',
  CLEAR: '#4F6F64',
};

interface ReviewEntry {
  day: string;
  focus_score: number | null;
  clarity_score: number | null;
  energy_score: number | null;
  mood_score: number | null;
}

const PerceptionsTab = () => {
  const { session } = useAuth();
  const { checkpoints, perceptionsDone, getPhasePerceptionValues, logPerception, actionsTaken } = useVYRStore();
  const [showInfo, setShowInfo] = useState(true);
  const [selectedPhase, setSelectedPhase] = useState<'BOOT' | 'HOLD' | 'CLEAR' | null>(null);
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(sliders.map((s) => [s.key, 5]))
  );
  const [history, setHistory] = useState<ReviewEntry[]>([]);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase.from('daily_reviews').select('day, focus_score, clarity_score, energy_score, mood_score')
      .eq('user_id', session.user.id).order('day', { ascending: false }).limit(14)
      .then(({ data }) => { if (data) setHistory(data); });
  }, [session?.user?.id]);

  const handleChange = (key: string, val: number) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const allPhasesDone = phases.every((p) => perceptionsDone.includes(p.key));
  const clearDone = perceptionsDone.includes('CLEAR');

  // Compute day mean values when all phases are done
  const dayMean = allPhasesDone ? (() => {
    const allValues = phases.map((p) => getPhasePerceptionValues(p.key)).filter(Boolean);
    if (allValues.length === 0) return null;
    return {
      foco: allValues.reduce((s, v) => s + v.foco, 0) / allValues.length,
      clareza: allValues.reduce((s, v) => s + v.clareza, 0) / allValues.length,
      energia: allValues.reduce((s, v) => s + v.energia, 0) / allValues.length,
      estabilidade: allValues.reduce((s, v) => s + v.estabilidade, 0) / allValues.length,
    };
  })() : null;

  const handlePhaseClick = (key: string) => {
    const isDone = perceptionsDone.includes(key);

    if (isDone) {
      // Toggle expanded view to show values
      setExpandedPhase(expandedPhase === key ? null : key);
      return;
    }

    if (!isPhaseActive(key)) {
      const window = getPhaseTimeWindow(key);
      toast.info(`${key} disponível no horário ${window.label}`);
      return;
    }

    setSelectedPhase(key as any);
    setExpandedPhase(null);
  };

  const handleSubmit = async () => {
    if (!selectedPhase) return;

    if (!isPhaseActive(selectedPhase)) {
      const window = getPhaseTimeWindow(selectedPhase);
      toast.info(`${selectedPhase} disponível apenas no horário ${window.label}`);
      return;
    }

    setSaving(true);
    try {
      await logPerception(selectedPhase, {
        foco: values.foco,
        clareza: values.clareza,
        energia: values.energia,
        estabilidade: values.estabilidade,
      });

      await recomputeStateWithPerceptions({
        energy: values.energia,
        clarity: values.clareza,
        focus: values.foco,
        stability: values.estabilidade,
      });

      // Check if this completes all 3 phases
      const updatedDone = [...perceptionsDone, selectedPhase];
      if (phases.every((p) => updatedDone.includes(p.key))) {
        const allValues = phases.map((p) => {
          if (p.key === selectedPhase) return { foco: values.foco, clareza: values.clareza, energia: values.energia, estabilidade: values.estabilidade };
          return getPhasePerceptionValues(p.key);
        }).filter(Boolean);
        await computeDayMeanFromPhases(allValues);
      }

      setSelectedPhase(null);
      setValues(Object.fromEntries(sliders.map((s) => [s.key, 5])));
      toast.success(`${selectedPhase} registrado`);
    } catch (err) {
      console.error('[perceptions] Save failed:', err);
      toast.error('Erro ao salvar percepção');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tutorial */}
      {showInfo && (
        <div className="rounded-2xl bg-card border border-border p-4" style={{ borderColor: 'hsl(var(--vyr-accent-action) / 0.2)' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Info size={16} className="text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Como funciona</span>
            </div>
            <button onClick={() => setShowInfo(false)} className="text-xs text-muted-foreground hover:text-foreground">Fechar</button>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Registre suas percepções em cada fase do dia. Cada fase só pode ser registrada dentro do seu horário.
          </p>
          <div className="flex justify-center gap-6 mb-3">
            {phases.map(({ key, label, sub, icon: Icon }) => (
              <div key={key} className="flex flex-col items-center gap-1.5">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Icon size={18} className="text-muted-foreground" />
                </div>
                <span className="text-xs font-semibold text-foreground">{label}</span>
                <span className="text-[10px] text-muted-foreground">{sub}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phase Status — Today's progress */}
      <div className="rounded-2xl bg-card border border-border p-4">
        <h3 className="text-xs uppercase tracking-[0.15em] font-semibold text-foreground mb-3">
          Fases do dia
        </h3>

        <div className="space-y-2 mb-4">
          {phases.map(({ key, label, sub, icon: Icon }) => {
            const isDone = perceptionsDone.includes(key);
            const isActive = isPhaseActive(key);
            const isSelected = selectedPhase === key && !isDone;
            const isExpanded = expandedPhase === key && isDone;
            const phaseValues = isDone ? getPhasePerceptionValues(key) : null;

            return (
              <div key={key}>
                <button
                  onClick={() => handlePhaseClick(key)}
                  className={`w-full flex items-center gap-3 py-3 px-3 rounded-xl transition-colors ${
                    isDone ? 'bg-muted/30'
                    : isSelected ? 'bg-foreground text-background'
                    : isActive ? 'bg-muted'
                    : 'bg-muted/20 opacity-50'
                  }`}
                >
                  {isDone ? (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: phaseColors[key] }}>
                      <Check size={16} className="text-white" />
                    </div>
                  ) : !isActive ? (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted flex-shrink-0">
                      <Lock size={14} className="text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted flex-shrink-0">
                      <Icon size={16} className={isSelected ? 'text-background' : 'text-muted-foreground'} />
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <span className={`text-sm font-medium ${isDone ? 'text-muted-foreground' : isSelected ? '' : 'text-foreground'}`}>
                      {label.toUpperCase()}
                    </span>
                    <p className={`text-[10px] ${isSelected ? 'opacity-70' : 'text-muted-foreground'}`}>{sub}</p>
                  </div>
                  {isDone && (
                    <ChevronDown size={14} className={`text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  )}
                  {!isDone && !isActive && (
                    <span className="text-[10px] text-muted-foreground">Aguardando horário</span>
                  )}
                </button>

                {/* Expanded phase values */}
                {isExpanded && phaseValues && (
                  <div className="ml-11 mt-1 rounded-lg bg-muted/20 p-3 space-y-1">
                    <div className="flex items-center gap-3 text-xs text-secondary-foreground">
                      <span>Foco: <span className="font-bold">{phaseValues.foco}</span></span>
                      <span>Clareza: <span className="font-bold">{phaseValues.clareza}</span></span>
                      <span>Energia: <span className="font-bold">{phaseValues.energia}</span></span>
                      <span>Estab.: <span className="font-bold">{phaseValues.estabilidade}</span></span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* All phases done — consolidated summary */}
        {allPhasesDone && dayMean && (
          <div className="rounded-xl bg-muted/30 p-4 text-center space-y-2">
            <p className="text-sm text-foreground font-medium">Dia completo</p>
            <div className="flex justify-center gap-4 text-xs text-secondary-foreground">
              <span>F: {dayMean.foco.toFixed(1)}</span>
              <span>C: {dayMean.clareza.toFixed(1)}</span>
              <span>E: {dayMean.energia.toFixed(1)}</span>
              <span>Es: {dayMean.estabilidade.toFixed(1)}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Média consolidada das 3 fases</p>
          </div>
        )}

        {/* Sliders for selected pending phase */}
        {selectedPhase && !perceptionsDone.includes(selectedPhase) && isPhaseActive(selectedPhase) && (
          <>
            <p className="text-xs text-muted-foreground mb-4">
              Registre sua percepção para a fase {selectedPhase}.
            </p>
            <div className="space-y-5">
              {sliders.map((s) => (
                <div key={s.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-foreground">{s.label}</span>
                    <span className="text-sm font-mono font-bold text-foreground">{values[s.key]}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{s.desc}</p>
                  <input type="range" min={0} max={10} value={values[s.key]}
                    onChange={(e) => handleChange(s.key, Number(e.target.value))}
                    className="w-full accent-primary h-1" />
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">Baixo</span>
                    <span className="text-[10px] text-muted-foreground">Médio</span>
                    <span className="text-[10px] text-muted-foreground">Alto</span>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={handleSubmit} disabled={saving}
              className="w-full rounded-xl font-medium py-3.5 text-sm transition-all active:scale-[0.98] hover:opacity-90 mt-6 disabled:opacity-50 text-foreground"
              style={{ background: phaseColors[selectedPhase], boxShadow: `0 4px 12px -4px ${phaseColors[selectedPhase]}66` }}>
              {saving ? 'Salvando...' : `Registrar ${selectedPhase}`}
            </button>
          </>
        )}
      </div>

      {/* History — only show consolidated after CLEAR is registered */}
      {clearDone && history.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-4">
          <h3 className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium mb-3">
            Histórico de percepções
          </h3>
          <p className="text-[10px] text-muted-foreground mb-3">F=Foco, C=Clareza, E=Energia, Es=Estabilidade</p>
          <div className="space-y-3">
            {history.map((r) => {
              const vals = [r.focus_score, r.clarity_score, r.energy_score, r.mood_score].filter((v): v is number => v != null);
              const mean = vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—';
              return (
                <div key={r.day} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.day + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-secondary-foreground">
                    <span>F:{r.focus_score ?? '—'}</span>
                    <span>C:{r.clarity_score ?? '—'}</span>
                    <span>E:{r.energy_score ?? '—'}</span>
                    <span>Es:{r.mood_score ?? '—'}</span>
                  </div>
                  <span className="text-sm font-bold text-primary">{mean}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Observações Livres */}
      {checkpoints.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-4">
          <h3 className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium mb-3">
            Observações livres
          </h3>
          <div className="space-y-3">
            {checkpoints.map((cp) => (
              <div key={cp.id} className="flex items-start gap-2">
                <Clock size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(cp.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <p className="text-sm text-secondary-foreground">{(cp.data as any)?.note || 'Sem nota'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PerceptionsTab;
