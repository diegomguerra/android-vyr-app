import { Lightbulb, Play } from 'lucide-react';
import type { VYRState } from '@/lib/vyr-engine';

interface TransitionCardProps {
  state: VYRState;
  actionsTaken: string[];
  onStartTransition: (phase: string) => void;
}

interface TransitionSuggestion {
  available: boolean;
  targetPhase: string;
  reason: string;
}

function getSuggestedTransition(state: VYRState, actionsTaken: string[]): TransitionSuggestion {
  const { phase, score, pillars } = state;
  const hour = new Date().getHours();

  if (phase === 'BOOT' && hour >= 8) {
    if (pillars.estabilidade <= 3 || pillars.energia <= 3) {
      return {
        available: true,
        targetPhase: 'HOLD',
        reason: 'Estabilidade ou energia em queda — sustentação recomendada.',
      };
    }
  }

  if (phase === 'HOLD' && hour >= 15) {
    if (score < 55 || pillars.energia <= 2.5) {
      return {
        available: true,
        targetPhase: 'CLEAR',
        reason: 'Score ou energia abaixo do ideal — recuperação sugerida.',
      };
    }
  }

  if (phase === 'CLEAR' && hour >= 5 && hour < 11) {
    if (score >= 65 && pillars.energia >= 3.5) {
      return {
        available: true,
        targetPhase: 'BOOT',
        reason: 'Condições favoráveis para ativação matinal.',
      };
    }
  }

  return { available: false, targetPhase: '', reason: '' };
}

const TransitionCard = ({ state, actionsTaken, onStartTransition }: TransitionCardProps) => {
  const suggestion = getSuggestedTransition(state, actionsTaken);

  if (!suggestion.available) return null;

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--vyr-accent-transition) / 0.3)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb size={16} style={{ color: 'hsl(var(--vyr-accent-transition))' }} />
        <span className="text-xs uppercase tracking-[0.15em] font-medium" style={{ color: 'hsl(var(--vyr-accent-transition))' }}>
          Transição disponível
        </span>
      </div>
      <p className="text-sm text-foreground">
        O sistema sugere transição para <span className="font-semibold">{suggestion.targetPhase}</span>.
      </p>
      <p className="text-xs text-muted-foreground mt-1">{suggestion.reason}</p>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onStartTransition(suggestion.targetPhase)}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-foreground transition-all active:scale-[0.98]"
          style={{
            background: 'hsl(var(--vyr-accent-transition))',
            boxShadow: '0 4px 20px -4px hsl(var(--vyr-accent-transition) / 0.4)',
          }}
        >
          <Play size={14} fill="currentColor" />
          Iniciar {suggestion.targetPhase}
        </button>
      </div>
    </div>
  );
};

export default TransitionCard;
