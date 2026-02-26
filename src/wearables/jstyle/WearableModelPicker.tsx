/**
 * WearableModelPicker — Select between X3 ring and J5Vital bracelet.
 */

import { Bluetooth, Watch } from 'lucide-react';
import type { WearableModel } from './wearable.types';

interface Props {
  selected: WearableModel;
  onSelect: (model: WearableModel) => void;
}

const MODELS: { id: WearableModel; label: string; desc: string; Icon: typeof Bluetooth }[] = [
  { id: 'X3', label: 'Ring X3', desc: 'Anel inteligente', Icon: Bluetooth },
  { id: 'J5Vital', label: 'J5Vital', desc: 'Pulseira V5', Icon: Watch },
];

export default function WearableModelPicker({ selected, onSelect }: Props) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4 space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Modelo do dispositivo</h3>
      <div className="grid grid-cols-2 gap-2">
        {MODELS.map(({ id, label, desc, Icon }) => {
          const active = selected === id;
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className={`rounded-xl border p-3 text-left transition-colors active:scale-[0.98] ${
                active
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-background hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon size={16} className={active ? 'text-primary' : 'text-muted-foreground'} />
                <span className={`text-xs font-semibold ${active ? 'text-primary' : 'text-foreground'}`}>
                  {label}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">{desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
