import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';

interface CheckpointModalProps {
  onClose: () => void;
  onSubmit: (note: string) => Promise<void>;
}

const CheckpointModal = ({ onClose, onSubmit }: CheckpointModalProps) => {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await onSubmit(note.trim());
      onClose();
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-t-3xl bg-card p-6 space-y-4"
        style={{ animation: 'slide-up 300ms ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium text-center">
          Checkpoint do sistema
        </h3>
        <p className="text-sm text-foreground text-center">
          Como você percebe este momento agora?
        </p>

        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Descreva como você se sente..."
          className="bg-background border-border rounded-xl focus:border-primary min-h-[100px]"
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-3 text-sm font-medium text-foreground transition-all active:scale-[0.98]"
          >
            Agora não
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !note.trim()}
            className="flex-1 rounded-xl py-3 text-sm font-medium text-primary-foreground transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'hsl(var(--vyr-accent-action))' }}
          >
            {saving ? 'Salvando...' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckpointModal;
