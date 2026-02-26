import { Clock } from 'lucide-react';

interface CognitiveWindowCardProps {
  score: number;
  clareza: number;
  estabilidade: number;
}

function getWindow(score: number, clareza: number, estabilidade: number): { available: boolean; duration: string; suggestion: string } {
  if (score >= 75 && clareza >= 4 && estabilidade >= 3.5) {
    return { available: true, duration: '3–4h', suggestion: 'Ideal para trabalho profundo e decisões complexas.' };
  }
  if (score >= 65 && clareza >= 3.5 && estabilidade >= 3) {
    return { available: true, duration: '2–3h', suggestion: 'Bom para tarefas que exigem atenção sustentada.' };
  }
  if (score >= 55 && clareza >= 3) {
    return { available: true, duration: '1–2h', suggestion: 'Intercale blocos curtos de foco com pausas.' };
  }
  return { available: false, duration: '', suggestion: '' };
}

const CognitiveWindowCard = ({ score, clareza, estabilidade }: CognitiveWindowCardProps) => {
  const window = getWindow(score, clareza, estabilidade);

  if (!window.available) return null;

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--vyr-accent-action) / 0.2)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Clock size={16} style={{ color: 'hsl(var(--vyr-accent-action))' }} />
        <span className="text-xs uppercase tracking-[0.15em] font-medium" style={{ color: 'hsl(var(--vyr-accent-action))' }}>
          Janela cognitiva
        </span>
      </div>
      <p className="text-sm text-foreground">
        Próximas <span className="font-semibold">{window.duration}</span> são favoráveis para foco profundo.
      </p>
      <p className="text-xs text-muted-foreground mt-1">{window.suggestion}</p>
    </div>
  );
};

export default CognitiveWindowCard;
