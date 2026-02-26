import { useMemo } from 'react';
import BackButton from '@/components/BackButton';
import StateRing from '@/components/StateRing';
import PillarRing from '@/components/PillarRing';
import InsightCard from '@/components/InsightCard';
import BottomNav from '@/components/BottomNav';
import { interpret } from '@/lib/vyr-interpreter';
import { useVYRStore } from '@/hooks/useVYRStore';

const pillarData = [
  { key: 'energia', label: 'Energia', colorVar: '--vyr-energia' },
  { key: 'clareza', label: 'Clareza', colorVar: '--vyr-clareza' },
  { key: 'estabilidade', label: 'Estabilidade', colorVar: '--vyr-estabilidade' },
];

const StateDetail = () => {
  const { state, hasData } = useVYRStore();
  const interpretation = useMemo(() => interpret(state), [state]);

  return (
    <div className="min-h-dvh bg-background pb-24 safe-area-top">
      <header className="flex items-center justify-between px-5 py-4">
        <BackButton />
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          Nível: {state.level}
        </span>
      </header>

      <div className="flex flex-col items-center pt-2">
        <StateRing score={state.score} stateLabel={hasData ? interpretation.stateLabel : 'Sem dados'} level={state.level} />
      </div>

      {/* Pillar Details */}
      <div className="px-5 mt-6">
        <div className="rounded-2xl bg-card border border-border p-4 space-y-0">
          {pillarData.map(({ key, label, colorVar }, i) => (
            <div key={key}>
              {i > 0 && <div className="h-px bg-border my-4" />}
              <div className="flex items-center gap-4">
                <PillarRing value={state.pillars[key as keyof typeof state.pillars]} label="" colorVar={colorVar} index={i} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{label}</span>
                    <span className="text-sm font-mono text-muted-foreground">
                      {state.pillars[key as keyof typeof state.pillars].toFixed(1)}/5
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {interpretation.pillarDescriptions[key]}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 mt-4 space-y-4">
        <InsightCard type="positive" title="Diagnóstico do sistema" description={interpretation.systemDiagnosis} />

        <p className="text-xs text-muted-foreground text-center px-4">
          Esta análise é baseada nos dados biométricos mais recentes e no seu histórico pessoal.
        </p>
      </div>

      <BottomNav />
    </div>
  );
};

export default StateDetail;
