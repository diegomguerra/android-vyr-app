import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus, ChevronRight, Play, AlertCircle, Check, Heart, RefreshCw } from 'lucide-react';
import StateRing from '@/components/StateRing';
import TransitionCard from '@/components/TransitionCard';
import SachetConfirmation from '@/components/SachetConfirmation';
import PerceptionModal from '@/components/PerceptionModal';
import CheckpointModal from '@/components/CheckpointModal';
import NotificationBell from '@/components/NotificationBell';
import ConnectionStatusPill from '@/components/ConnectionStatusPill';
import BottomNav from '@/components/BottomNav';
import BrainLogo from '@/components/BrainLogo';
import { interpret } from '@/lib/vyr-interpreter';
import { useVYRStore } from '@/hooks/useVYRStore';
import { getLocalToday } from '@/lib/date-utils';
import { isPhaseActive, getPhaseTimeWindow, getCurrentPhase, getActiveDosePhase } from '@/lib/vyr-engine';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Bom dia';
  if (h >= 12 && h < 18) return 'Boa tarde';
  return 'Boa noite';
}

const phaseConfig: Record<string, { label: string; colorVar: string; color: string; desc: string; actionLabel: string }> = {
  BOOT: { label: 'BOOT', colorVar: '--vyr-accent-action', color: '#556B8A', desc: 'Ativação cognitiva (05h–11h)', actionLabel: 'Clique ao tomar BOOT' },
  HOLD: { label: 'HOLD', colorVar: '--vyr-accent-transition', color: '#8F7A4A', desc: 'Sustentação cognitiva (12h–17h30)', actionLabel: 'Clique ao tomar HOLD' },
  CLEAR: { label: 'CLEAR', colorVar: '--vyr-accent-stable', color: '#4F6F64', desc: 'Recuperação cognitiva (18h30–23h59)', actionLabel: 'Clique ao tomar CLEAR' },
};

const pillarNames: Record<string, string> = {
  energia: 'Energia',
  clareza: 'Clareza',
  estabilidade: 'Estabilidade',
};

/* ── Expanded Pillar Card with mini-gauge ── */

function PillarCard({ name, value, description, index }: { name: string; value: number; description: string; index: number }) {
  const circleRef = useRef<SVGCircleElement>(null);
  const size = 48;
  const stroke = 3.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcFraction = 0.75;
  const arcLength = circumference * arcFraction;
  const progress = (value / 5) * arcLength;
  const dashOffset = arcLength - progress;

  const isCritical = value < 2.0;
  const arcColor = isCritical ? '#DC2626' : '#F59E0B';

  useEffect(() => {
    const circle = circleRef.current;
    if (!circle) return;
    circle.style.strokeDashoffset = `${arcLength}`;
    const delay = 200 + index * 100;
    setTimeout(() => {
      circle.style.transition = 'stroke-dashoffset 800ms cubic-bezier(0.4, 0, 0.2, 1)';
      circle.style.strokeDashoffset = `${dashOffset}`;
    }, delay);
  }, [value, arcLength, dashOffset, index]);

  const borderColor = isCritical && name === 'Estabilidade' ? '#1F0A0A' : '#1A1A1A';

  return (
    <div
      className="rounded-2xl p-4 flex items-center gap-4"
      style={{
        background: '#0E0E0E',
        border: `1px solid ${borderColor}`,
        animation: `slide-up 200ms ease-out ${200 + index * 100}ms both`,
      }}
    >
      {/* Mini-gauge */}
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-225deg)' }}>
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="rgba(255,255,255,0.06)"
            strokeWidth={stroke} strokeDasharray={`${arcLength} ${circumference}`} strokeLinecap="round"
          />
          <circle
            ref={circleRef}
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={arcColor}
            strokeWidth={stroke} strokeDasharray={`${arcLength} ${circumference}`} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${arcColor}44)` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-light tabular-nums" style={{ color: arcColor }}>
            {value.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Name + description */}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-[#E8E8E8]">{name}</span>
        <p className="text-xs text-[#667788] mt-0.5 leading-relaxed">{description}</p>
      </div>

      {/* Value */}
      <span className="text-sm font-light tabular-nums flex-shrink-0" style={{ color: arcColor }}>
        {value.toFixed(1)}/5
      </span>
    </div>
  );
}

const Home = () => {
  const navigate = useNavigate();
  const store = useVYRStore();
  const { state, hasData, userName, actionsTaken, perceptionsDone, getPhasePerceptionValues, logPerception, wearableConnection, connectWearable } = store;
  const [showCheckpoint, setShowCheckpoint] = useState(false);
  const [perceptionModal, setPerceptionModal] = useState<{ show: boolean; phase: string }>({ show: false, phase: 'BOOT' });
  const [sachetPhase, setSachetPhase] = useState<string | null>(null);
  const [connectingHC, setConnectingHC] = useState(false);
  const [syncingHC, setSyncingHC] = useState(false);

  const isHCConnected = wearableConnection?.status === 'active' || wearableConnection?.status === 'connected';

  const interpretation = useMemo(() => interpret(state), [state]);

  // Delta (today vs yesterday)
  const delta = useMemo(() => {
    if (store.historyByDay.length < 2) return 0;
    const today = getLocalToday();
    const todayEntry = store.historyByDay.find((h) => h.day === today);
    const yesterdayEntry = store.historyByDay.find((h) => h.day !== today);
    if (todayEntry && yesterdayEntry) return todayEntry.score - yesterdayEntry.score;
    return 0;
  }, [store.historyByDay]);

  // Collect existing perception values for the day
  const existingPhaseValues = useMemo(() => {
    return perceptionsDone
      .map((p) => {
        const vals = getPhasePerceptionValues(p);
        return vals ? { phase: p, values: vals } : null;
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);
  }, [perceptionsDone, getPhasePerceptionValues]);

  const handleConfirmSachet = useCallback(async () => {
    try {
      const currentPhase = getCurrentPhase();
      await store.logAction(currentPhase);
      store.dismissConfirmation();
      setPerceptionModal({ show: true, phase: currentPhase });
    } catch (err) {
      console.error('[home] Failed to log action:', err);
    }
  }, [store]);

  const handlePerceptionSave = useCallback(async (phase: string, values: { foco: number; clareza: number; energia: number; estabilidade: number }) => {
    await logPerception(phase, values);
  }, [logPerception]);

  const handlePerceptionClose = useCallback(() => {
    const closingPhase = perceptionModal.phase;
    setPerceptionModal({ show: false, phase: '' });
    setSachetPhase(closingPhase);
  }, [perceptionModal.phase]);

  // Limiting factor info
  const limitingPillarName = pillarNames[state.limitingFactor] || state.limitingFactor;
  const limitingValue = state.pillars[state.limitingFactor as keyof typeof state.pillars];
  const limitingLevel = limitingValue < 2.0 ? 'NÍVEL CRÍTICO' : limitingValue < 3.0 ? 'NÍVEL BAIXO' : 'NÍVEL MODERADO';

  return (
    <div className="min-h-dvh bg-background pb-24 safe-area-top" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* 1. Header */}
      <header className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <BrainLogo size={32} />
          <span className="text-sm text-foreground" style={{ fontWeight: 500 }}>
            {getGreeting()}{userName ? `, ${userName}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ConnectionStatusPill />
          <NotificationBell />
        </div>
      </header>

      {/* Health Connect Banner */}
      {!isHCConnected && (
        <div className="mx-5 mb-2 rounded-2xl p-4" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
              <Heart size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm text-foreground" style={{ fontWeight: 500 }}>Health Connect</h3>
              <p className="text-xs text-muted-foreground" style={{ fontWeight: 400 }}>Conecte para sincronizar dados do wearable.</p>
            </div>
          </div>
          <button
            onClick={async () => {
              setConnectingHC(true);
              await connectWearable();
              setConnectingHC(false);
            }}
            disabled={connectingHC}
            className="w-full mt-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-2.5 text-sm transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ fontWeight: 500 }}
          >
            {connectingHC ? 'Conectando...' : 'Conectar e Sincronizar'}
          </button>
        </div>
      )}

      {/* Syncing indicator */}
      {isHCConnected && syncingHC && (
        <div className="mx-5 mb-2 flex items-center justify-center gap-2 py-2 rounded-xl" style={{ background: 'hsl(var(--card))' }}>
          <RefreshCw size={14} className="animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground" style={{ fontWeight: 400 }}>Sincronizando Health Connect...</span>
        </div>
      )}

      {/* ── 1. VYR State Gauge ── */}
      <div className="flex flex-col items-center pt-2" style={{ animation: 'fade-in 150ms ease-out' }}>
        <div onClick={() => hasData && navigate('/state')} className={hasData ? 'cursor-pointer' : ''}>
          <StateRing
            score={state.score}
            stateLabel={hasData ? interpretation.stateLabel : 'Sem dados'}
            level={state.level}
          />
        </div>

        {/* ScoreDelta */}
        {hasData && (
          <div className="flex items-center gap-1 mt-3 animate-delta-pulse">
            {delta > 0 ? (
              <TrendingUp size={14} className="text-vyr-positive" />
            ) : delta < 0 ? (
              <TrendingDown size={14} className="text-vyr-caution" />
            ) : (
              <Minus size={14} className="text-vyr-text-muted" />
            )}
            <span className={`text-xs ${delta > 0 ? 'text-vyr-positive' : delta < 0 ? 'text-vyr-caution' : 'text-vyr-text-muted'}`} style={{ fontWeight: 500 }}>
              {delta > 0 ? '+' : ''}{delta} pts vs ontem
            </span>
          </div>
        )}
      </div>

      <div className="px-5 mt-6 space-y-4">
        {!hasData ? (
          <>
            {/* Empty state pillar cards */}
            {['Energia', 'Clareza', 'Estabilidade'].map((label, i) => (
              <div
                key={label}
                className="rounded-2xl p-4 flex items-center gap-4"
                style={{ background: '#0E0E0E', border: '1px solid #1A1A1A' }}
              >
                <span className="text-lg font-light text-foreground w-8 text-center">0</span>
                <div className="flex-1">
                  <span className="text-sm text-foreground" style={{ fontWeight: 500 }}>{label}</span>
                  <p className="text-xs text-[#667788]" style={{ fontWeight: 400 }}>Aguardando leitura.</p>
                </div>
                <span className="text-xs text-[#667788]" style={{ fontWeight: 300 }}>0/5</span>
              </div>
            ))}
            <div className="rounded-2xl p-4" style={{ background: '#0D0D0D', border: '1px solid #1A1A1A' }}>
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-[#F59E0B] mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm text-foreground" style={{ fontWeight: 500 }}>Diagnóstico do sistema</h3>
                  <p className="text-xs text-[#667788] mt-1 leading-relaxed" style={{ fontWeight: 400 }}>
                    Conecte um wearable para que o VYR possa calcular seu estado cognitivo.
                  </p>
                </div>
              </div>
              <p className="text-xs text-[#667788] text-center mt-4" style={{ fontWeight: 400 }}>Sem dados disponíveis.</p>
            </div>
          </>
        ) : (
          <>
            {/* ── 2. Card "Hoje isso significa" ── */}
            <button
              onClick={() => navigate('/state')}
              className="w-full rounded-2xl p-4 text-left transition-transform active:scale-[0.98]"
              style={{ background: '#0C1220', border: '1px solid #1E293B' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3
                    className="text-xs uppercase"
                    style={{ fontWeight: 500, color: '#4B7BEC', letterSpacing: '0.16em' }}
                  >
                    Hoje isso significa
                  </h3>
                  <p className="text-xs mt-1" style={{ fontWeight: 400, color: '#445566' }}>
                    O que o sistema projeta para o seu dia.
                  </p>
                </div>
                <ChevronRight size={18} style={{ color: '#445566' }} />
              </div>
            </button>

            {/* ── 3. Índices (Energia / Clareza / Estabilidade) ── */}
            <PillarCard
              name="Energia"
              value={state.pillars.energia}
              description={interpretation.pillarDescriptions.energia}
              index={0}
            />
            <PillarCard
              name="Clareza"
              value={state.pillars.clareza}
              description={interpretation.pillarDescriptions.clareza}
              index={1}
            />
            <PillarCard
              name="Estabilidade"
              value={state.pillars.estabilidade}
              description={interpretation.pillarDescriptions.estabilidade}
              index={2}
            />

            {/* ── 4. Leitura do sistema (unified) ── */}
            <div className="rounded-2xl p-4" style={{ background: '#0D0D0D', border: '1px solid #1A1A1A' }}>
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="flex-shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
                <div className="min-w-0">
                  <h4
                    className="text-xs uppercase"
                    style={{ fontWeight: 500, color: '#F59E0B', letterSpacing: '0.14em' }}
                  >
                    Leitura do sistema
                  </h4>
                  <p className="text-xs mt-2 leading-relaxed" style={{ fontWeight: 400, color: '#99AABB' }}>
                    {interpretation.whyScore}
                  </p>
                  <p className="text-xs mt-1.5 leading-relaxed" style={{ fontWeight: 400, color: '#778899' }}>
                    {interpretation.dayRisk}
                  </p>
                </div>
              </div>

              {/* Footer — fator limitante */}
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid #171717' }}>
                <p
                  className="text-[10px] uppercase text-center"
                  style={{ fontWeight: 500, color: '#556677', letterSpacing: '0.14em' }}
                >
                  FATOR LIMITANTE: {limitingPillarName.toUpperCase()} · {limitingLevel}
                </p>
              </div>
            </div>

            {/* TransitionCard */}
            <TransitionCard
              state={state}
              actionsTaken={actionsTaken}
              onStartTransition={store.activateTransition}
            />

            {/* Protocol CTA */}
            {(() => {
              const activeDose = getActiveDosePhase();

              if (!activeDose) {
                // Between dose windows — find next upcoming phase
                const now = new Date();
                const mins = now.getHours() * 60 + now.getMinutes();
                let nextPhase: string;
                let nextLabel: string;
                if (mins < 300) { nextPhase = 'BOOT'; nextLabel = '05h'; }
                else if (mins >= 660 && mins < 720) { nextPhase = 'HOLD'; nextLabel = '12h'; }
                else if (mins >= 1050 && mins < 1110) { nextPhase = 'CLEAR'; nextLabel = '18h30'; }
                else { nextPhase = 'BOOT'; nextLabel = '05h (amanhã)'; }

                return (
                  <div className="rounded-2xl bg-card border border-border p-4 text-center space-y-1">
                    <p className="text-xs text-muted-foreground">Nenhuma dose ativa no momento.</p>
                    <p className="text-xs text-muted-foreground">
                      Próxima fase: <span className="font-medium text-foreground">{nextPhase}</span> às {nextLabel}
                    </p>
                  </div>
                );
              }

              const activeConfig = phaseConfig[activeDose];
              const doseRegistered = actionsTaken.includes(activeDose);
              const perceptionRegistered = perceptionsDone.includes(activeDose);
              const phaseComplete = doseRegistered && perceptionRegistered;

              if (phaseComplete) {
                // Current dose done — show next phase info
                const nextPhases = { BOOT: 'HOLD', HOLD: 'CLEAR', CLEAR: null } as const;
                const next = nextPhases[activeDose];
                if (next) {
                  const nextWindow = getPhaseTimeWindow(next);
                  return (
                    <div className="rounded-2xl p-4 text-center space-y-1" style={{ background: '#0E0E0E', border: '1px solid #1A1A1A' }}>
                      <div className="flex items-center justify-center gap-2">
                        <Check size={16} style={{ color: activeConfig.color }} />
                        <span className="text-sm font-medium text-foreground">{activeDose} registrado</span>
                      </div>
                      <p className="text-xs" style={{ fontWeight: 400, color: '#667788' }}>
                        Próxima fase: <span className="text-foreground" style={{ fontWeight: 500 }}>{next}</span> a partir das {nextWindow.label.split('–')[0]}
                      </p>
                    </div>
                  );
                }
                return (
                  <div className="rounded-2xl p-4 text-center space-y-1" style={{ background: '#0E0E0E', border: '1px solid #1A1A1A' }}>
                    <div className="flex items-center justify-center gap-2">
                      <Check size={16} style={{ color: activeConfig.color }} />
                      <span className="text-sm font-medium text-foreground">Protocolo do dia completo</span>
                    </div>
                    <p className="text-xs" style={{ fontWeight: 400, color: '#667788' }}>Todas as fases foram registradas.</p>
                  </div>
                );
              }

              // Show CTA for active dose phase
              return (
                <>
                  <div className="rounded-2xl bg-card border border-border p-4">
                    <h3 className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium mb-1">
                      Protocolo {activeConfig.label}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-3">{activeConfig.desc}. Registre quando tomar o sachet desta fase.</p>
                  </div>

                  <button
                    onClick={handleConfirmSachet}
                    className="w-full rounded-xl py-4 flex flex-col items-center gap-1 text-sm text-foreground transition-transform active:scale-[0.98]"
                    style={{
                      background: activeConfig.color,
                      boxShadow: `0 4px 20px -4px ${activeConfig.color}66`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Play size={16} fill="currentColor" />
                      <span>Protocolo {activeConfig.label}</span>
                    </div>
                    <span className="text-[10px] opacity-70">{activeConfig.actionLabel}</span>
                  </button>
                  <p className="text-[10px] text-muted-foreground text-center -mt-2">
                    Registre aqui quando tomar o sachet da fase {activeConfig.label}.
                  </p>
                </>
              );
            })()}
          </>
        )}
      </div>

      <BottomNav />

      {/* Perception Modal */}
      {perceptionModal.show && (
        <PerceptionModal
          phase={perceptionModal.phase}
          onSave={handlePerceptionSave}
          onClose={handlePerceptionClose}
          existingPhaseValues={existingPhaseValues}
        />
      )}

      {/* SachetConfirmation */}
      {sachetPhase && (
        <SachetConfirmation
          phase={sachetPhase}
          onDismiss={() => setSachetPhase(null)}
          onAddObservation={() => {
            setSachetPhase(null);
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
