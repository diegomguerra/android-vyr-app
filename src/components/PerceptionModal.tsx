import { useState } from 'react';
import { X } from 'lucide-react';
import { recomputeStateWithPerceptions, computeDayMeanFromPhases } from '@/lib/vyr-recompute';
import type { PhasePerceptionValues } from '@/lib/vyr-recompute';
import { toast } from 'sonner';

const phaseConfig: Record<string, { label: string; desc: string; colorVar: string; color: string }> = {
  BOOT: { label: 'BOOT', desc: 'Manhã · Ativação (05h–11h)', colorVar: '--vyr-accent-action', color: '#556B8A' },
  HOLD: { label: 'HOLD', desc: 'Tarde · Sustentação (11h–17h)', colorVar: '--vyr-accent-transition', color: '#8F7A4A' },
  CLEAR: { label: 'CLEAR', desc: 'Noite · Recuperação (17h–22h)', colorVar: '--vyr-accent-stable', color: '#4F6F64' },
};

const sliders = [
  { key: 'foco', label: 'FOCO', desc: 'Como está sua capacidade de concentração?' },
  { key: 'clareza', label: 'CLAREZA', desc: 'Sua mente está clara ou confusa?' },
  { key: 'energia', label: 'ENERGIA', desc: 'Qual seu nível de energia física?' },
  { key: 'estabilidade', label: 'ESTABILIDADE', desc: 'Como está sua estabilidade emocional?' },
];

interface PerceptionModalProps {
  phase: string;
  onSave: (phase: string, values: PhasePerceptionValues) => Promise<void>;
  onClose: () => void;
  /** All phase values already registered today (to compute day mean after 3rd) */
  existingPhaseValues: { phase: string; values: PhasePerceptionValues }[];
}

const PerceptionModal = ({ phase, onSave, onClose, existingPhaseValues }: PerceptionModalProps) => {
  const config = phaseConfig[phase] || phaseConfig.BOOT;
  const [values, setValues] = useState<Record<string, number>>({ foco: 5, clareza: 5, energia: 5, estabilidade: 5 });
  const [saving, setSaving] = useState(false);

  const handleChange = (key: string, val: number) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const perceptionValues: PhasePerceptionValues = {
        foco: values.foco,
        clareza: values.clareza,
        energia: values.energia,
        estabilidade: values.estabilidade,
      };

      // Save perception action_log
      await onSave(phase, perceptionValues);

      // Recompute VYR state with this perception
      await recomputeStateWithPerceptions({
        energy: values.energia,
        clarity: values.clareza,
        focus: values.foco,
        stability: values.estabilidade,
      });

      // Check if this is the 3rd phase — compute day mean
      const allPhases = [...existingPhaseValues, { phase, values: perceptionValues }];
      const uniquePhases = new Set(allPhases.map((p) => p.phase));
      if (uniquePhases.size >= 3) {
        const allValues = allPhases
          .filter((p, i, arr) => arr.findIndex((x) => x.phase === p.phase) === i)
          .map((p) => p.values);
        await computeDayMeanFromPhases(allValues);
      }

      toast.success(`${phase} registrado`);
      onClose();
    } catch (err) {
      console.error('[PerceptionModal] Save failed:', err);
      toast.error('Erro ao salvar percepção');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-t-3xl bg-card p-6 space-y-4 max-h-[85vh] overflow-y-auto"
        style={{ animation: 'slide-up 300ms ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center gap-2 pt-2">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
            style={{ background: `${config.color}33`, color: config.color }}
          >
            {config.label[0]}
          </div>
          <h3 className="text-lg font-semibold text-foreground">Percepção {config.label}</h3>
          <p className="text-xs text-muted-foreground">{config.desc}</p>
        </div>

        {/* Sliders */}
        <div className="space-y-5">
          {sliders.map((s) => (
            <div key={s.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-foreground">{s.label}</span>
                <span className="text-sm font-mono font-bold text-foreground">{values[s.key]}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{s.desc}</p>
              <input
                type="range"
                min={0}
                max={10}
                value={values[s.key]}
                onChange={(e) => handleChange(s.key, Number(e.target.value))}
                className="w-full accent-primary h-1"
              />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">Baixo</span>
                <span className="text-[10px] text-muted-foreground">Médio</span>
                <span className="text-[10px] text-muted-foreground">Alto</span>
              </div>
            </div>
          ))}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full rounded-xl py-3.5 text-sm font-medium text-foreground transition-all active:scale-[0.98] disabled:opacity-50"
          style={{
            background: config.color,
            boxShadow: `0 4px 12px -4px ${config.color}66`,
          }}
        >
          {saving ? 'Salvando...' : `Registrar ${config.label}`}
        </button>
      </div>
    </div>
  );
};

export default PerceptionModal;
