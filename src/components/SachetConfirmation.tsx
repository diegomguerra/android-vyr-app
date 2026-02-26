import { Check, X } from 'lucide-react';

interface SachetConfirmationProps {
  phase: string;
  onDismiss: () => void;
  onAddObservation: () => void;
}

const phaseConfig: Record<string, { next: string; colorVar: string }> = {
  BOOT: { next: '2–3h', colorVar: '--vyr-accent-action' },
  HOLD: { next: '3–4h', colorVar: '--vyr-accent-transition' },
  CLEAR: { next: 'amanhã', colorVar: '--vyr-accent-stable' },
};

const SachetConfirmation = ({ phase, onDismiss, onAddObservation }: SachetConfirmationProps) => {
  const config = phaseConfig[phase] || phaseConfig.BOOT;
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onDismiss}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-t-3xl bg-card p-6 space-y-4"
        style={{ animation: 'slide-up 300ms ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button onClick={onDismiss} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center gap-3 pt-2">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: `hsl(var(${config.colorVar}) / 0.2)` }}
          >
            <Check size={28} style={{ color: `hsl(var(${config.colorVar}))` }} />
          </div>
          <h3 className="text-lg font-semibold text-foreground">{phase} ativado</h3>
        </div>

        {/* Info */}
        <div className="space-y-2 text-center">
          <p className="text-sm text-muted-foreground">
            Registrado às <span className="font-mono font-medium text-foreground">{timeStr}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Próxima leitura em <span className="font-medium text-foreground">{config.next}</span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onAddObservation}
            className="flex-1 rounded-xl border border-border py-3 text-sm font-medium text-foreground transition-all active:scale-[0.98]"
          >
            Adicionar observação
          </button>
          <button
            onClick={onDismiss}
            className="flex-1 rounded-xl py-3 text-sm font-medium text-foreground transition-all active:scale-[0.98]"
            style={{
              background: `hsl(var(${config.colorVar}))`,
              boxShadow: `0 4px 12px -4px hsl(var(${config.colorVar}) / 0.4)`,
            }}
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SachetConfirmation;
