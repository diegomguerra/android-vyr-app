import { useState } from 'react';
import { Bell } from 'lucide-react';

const signalItems = [
  {
    title: 'Sistema pronto para iniciar foco.',
    desc: 'Notifica quando há janela cognitiva favorável.',
  },
  {
    title: 'Mudança de estado detectada.',
    desc: 'Alerta sobre variações significativas.',
  },
  {
    title: 'Janela ideal para sustentação disponível.',
    desc: 'Indica momento para ativar HOLD.',
  },
  {
    title: 'Encerramento cognitivo disponível.',
    desc: 'Sugere transição para recuperação.',
  },
];

const SignalsTab = () => {
  const [enabled, setEnabled] = useState<Record<number, boolean>>(
    Object.fromEntries(signalItems.map((_, i) => [i, true]))
  );

  const toggle = (idx: number) => {
    setEnabled((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-4">
        Configure quais sinais do sistema deseja receber.
      </p>
      {signalItems.map((item, i) => (
        <div key={i} className="rounded-2xl bg-card border border-border p-4 flex items-start gap-3">
          <Bell size={18} className="text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-foreground leading-tight">{item.title}</h4>
            <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
          </div>
          <button
            onClick={() => toggle(i)}
            className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${
              enabled[i] ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <div
              className={`absolute top-0.5 w-6 h-6 rounded-full bg-foreground transition-transform ${
                enabled[i] ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      ))}
    </div>
  );
};

export default SignalsTab;
