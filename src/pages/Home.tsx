import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus, ChevronRight, Play, Activity } from 'lucide-react';
import StateRing from '@/components/StateRing';
import PillarRing from '@/components/PillarRing';
import ContextCard from '@/components/ContextCard';
import InsightCard from '@/components/InsightCard';
import CognitiveWindowCard from '@/components/CognitiveWindowCard';
import TransitionCard from '@/components/TransitionCard';
import SachetConfirmation from '@/components/SachetConfirmation';
import CheckpointModal from '@/components/CheckpointModal';
import NotificationBell from '@/components/NotificationBell';
import ConnectionStatusPill from '@/components/ConnectionStatusPill';
import BottomNav from '@/components/BottomNav';
import BrainLogo from '@/components/BrainLogo';
import { interpret } from '@/lib/vyr-interpreter';
import { useVYRStore } from '@/hooks/useVYRStore';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Bom dia';
  if (h >= 12 && h < 18) return 'Boa tarde';
  return 'Boa noite';
}

const phaseConfig = {
  BOOT: { label: 'BOOT', colorVar: '--vyr-accent-action', color: '#556B8A', desc: 'Ativação cognitiva', actionLabel: 'Clique ao tomar BOOT' },
  HOLD: { label: 'HOLD', colorVar: '--vyr-accent-transition', color: '#8F7A4A', desc: 'Sustentação cognitiva', actionLabel: 'Clique ao tomar HOLD' },
  CLEAR: { label: 'CLEAR', colorVar: '--vyr-accent-stable', color: '#4F6F64', desc: 'Recuperação cognitiva', actionLabel: 'Clique ao tomar CLEAR' },
};

const Home = () => {
  const navigate = useNavigate();
  const store = useVYRStore();
  const { state, hasData, userName, actionsTaken, sachetConfirmation } = store;
  const [showCheckpoint, setShowCheckpoint] = useState(false);

  const interpretation = useMemo(() => interpret(state), [state]);
  const phase = phaseConfig[state.phase];

  // Delta (today vs yesterday)
  const delta = useMemo(() => {
    if (store.historyByDay.length < 2) return 0;
    const today = new Date().toISOString().split('T')[0];
    const todayEntry = store.historyByDay.find((h) => h.day === today);
    const yesterdayEntry = store.historyByDay.find((h) => h.day !== today);
    if (todayEntry && yesterdayEntry) return todayEntry.score - yesterdayEntry.score;
    return 0;
  }, [store.historyByDay]);

  const handleConfirmSachet = useCallback(async () => {
    try {
      await store.logAction(state.phase);
    } catch (err) {
      console.error('[home] Failed to log action:', err);
    }
  }, [state.phase, store]);

  return (
    <div className="min-h-dvh bg-background pb-24 safe-area-top">
      {/* 1. Header */}
      <header className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <BrainLogo size={32} />
          <span className="text-sm text-foreground font-medium">
            {getGreeting()}{userName ? `, ${userName}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ConnectionStatusPill />
          <NotificationBell />
        </div>
      </header>

      {/* 2. StateRing */}
      <div className="flex flex-col items-center pt-2" style={{ animation: 'fade-in 150ms ease-out' }}>
        <div onClick={() => hasData && navigate('/state')} className={hasData ? 'cursor-pointer' : ''}>
          <StateRing
            score={state.score}
            stateLabel={hasData ? interpretation.stateLabel : 'Sem dados'}
            level={state.level}
          />
        </div>

        {/* 3. ScoreDelta */}
        {hasData && (
          <div className="flex items-center gap-1 mt-3 animate-delta-pulse">
            {delta > 0 ? (
              <TrendingUp size={14} className="text-vyr-positive" />
            ) : delta < 0 ? (
              <TrendingDown size={14} className="text-vyr-caution" />
            ) : (
              <Minus size={14} className="text-vyr-text-muted" />
            )}
            <span className={`text-xs font-medium ${delta > 0 ? 'text-vyr-positive' : delta < 0 ? 'text-vyr-caution' : 'text-vyr-text-muted'}`}>
              {delta > 0 ? '+' : ''}{delta} pts vs ontem
            </span>
          </div>
        )}

        {/* 4. PillarRings */}
        {hasData && (
          <div className="flex items-center justify-center gap-8 mt-6">
            <PillarRing value={state.pillars.energia} label="Energia" colorVar="--vyr-energia" index={0} />
            <PillarRing value={state.pillars.clareza} label="Clareza" colorVar="--vyr-clareza" index={1} />
            <PillarRing value={state.pillars.estabilidade} label="Estabilidade" colorVar="--vyr-estabilidade" index={2} />
          </div>
        )}
      </div>

      <div className="px-5 mt-6 space-y-4">
        {!hasData ? (
          <>
            {['Energia', 'Clareza', 'Estabilidade'].map((label) => (
              <div key={label} className="rounded-2xl bg-card border border-border p-4 flex items-center gap-4">
                <span className="text-lg font-mono font-bold text-foreground w-8 text-center">0</span>
                <div className="flex-1">
                  <span className="text-sm font-medium text-foreground">{label}</span>
                  <p className="text-xs text-muted-foreground">Aguardando leitura.</p>
                </div>
                <span className="text-xs font-mono text-muted-foreground">0/5</span>
              </div>
            ))}
            <div className="rounded-2xl bg-card border border-border p-4">
              <div className="flex items-start gap-3">
                <Activity size={20} className="text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Diagnóstico do sistema</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Conecte um wearable para que o VYR possa calcular seu estado cognitivo.
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-4">Sem dados disponíveis.</p>
            </div>
          </>
        ) : (
          <>
            {/* 5. ContextCard */}
            <ContextCard items={interpretation.contextItems} />

            {/* 6. CognitiveWindowCard */}
            <CognitiveWindowCard
              score={state.score}
              clareza={state.pillars.clareza}
              estabilidade={state.pillars.estabilidade}
            />

            {/* 7. InsightCard - Leitura do sistema */}
            <InsightCard
              type={interpretation.systemReadingType}
              title="Leitura do sistema"
              description={interpretation.whyScore}
              detail={interpretation.dayRisk}
              muted={interpretation.limitingFactorText}
            />

            {/* 8. Hoje isso significa */}
            <button
              onClick={() => navigate('/state')}
              className="w-full rounded-2xl bg-card p-4 text-left transition-transform active:scale-[0.98]"
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs uppercase tracking-[0.15em] text-vyr-text-muted font-medium">
                  Hoje isso significa
                </h3>
                <ChevronRight size={16} className="text-vyr-text-muted" />
              </div>
              <p className="text-[10px] text-muted-foreground mb-2">O que o sistema projeta para o seu dia.</p>
              <div className="space-y-2">
                {interpretation.todayMeans.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'hsl(var(--vyr-accent-action))' }} />
                    <span className="text-sm text-secondary-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </button>

            {/* 9. TransitionCard */}
            <TransitionCard
              state={state}
              actionsTaken={actionsTaken}
              onStartTransition={store.activateTransition}
            />

            {/* 10. Ação Principal */}
            <div className="rounded-2xl bg-card border border-border p-4">
              <h3 className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium mb-1">
                Protocolo {phase.label}
              </h3>
              <p className="text-xs text-muted-foreground mb-3">{phase.desc}. Registre quando tomar o sachet desta fase.</p>
            </div>

            <button
              onClick={handleConfirmSachet}
              className="w-full rounded-xl py-4 flex flex-col items-center gap-1 text-sm font-medium text-foreground transition-transform active:scale-[0.98]"
              style={{
                background: phase.color,
                boxShadow: `0 4px 20px -4px ${phase.color}66`,
              }}
            >
              <div className="flex items-center gap-2">
                <Play size={16} fill="currentColor" />
                <span>Protocolo {phase.label}</span>
              </div>
              <span className="text-[10px] opacity-70">{phase.actionLabel}</span>
            </button>
            <p className="text-[10px] text-muted-foreground text-center -mt-2">
              Registre aqui quando tomar o sachet da fase {phase.label}.
            </p>
          </>
        )}
      </div>

      <BottomNav />

      {/* 11. SachetConfirmation */}
      {sachetConfirmation.show && (
        <SachetConfirmation
          phase={sachetConfirmation.phase}
          onDismiss={store.dismissConfirmation}
          onAddObservation={() => {
            store.dismissConfirmation();
            setShowCheckpoint(true);
          }}
        />
      )}

      {/* Checkpoint Modal */}
      {showCheckpoint && (
        <CheckpointModal
          onClose={() => setShowCheckpoint(false)}
          onSubmit={store.addCheckpoint}
        />
      )}
    </div>
  );
};

export default Home;
