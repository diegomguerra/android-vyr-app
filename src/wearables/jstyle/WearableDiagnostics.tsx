/**
 * WearableDiagnostics — Debug panel (only visible when WEARABLE_DEBUG=true).
 */

import { useState, useEffect } from 'react';
import { wearableStore } from './wearable.store';

export default function WearableDiagnostics() {
  const [, forceUpdate] = useState(0);
  useEffect(() => wearableStore.subscribe(() => forceUpdate((n) => n + 1)), []);

  const { diagnostics, lastSyncAt, selectedModel } = wearableStore.getState();
  if (!diagnostics) return null;

  const rows = [
    { label: 'Modelo', value: selectedModel },
    { label: 'Device UID', value: diagnostics.deviceId },
    { label: 'MAC', value: diagnostics.mac ?? '—' },
    { label: 'Firmware', value: diagnostics.fwVersion ?? '—' },
    { label: 'Bateria', value: diagnostics.battery != null ? `${diagnostics.battery}%` : '—' },
    { label: 'Último erro', value: diagnostics.lastError ?? 'Nenhum' },
    { label: 'Último sync', value: lastSyncAt ?? '—' },
  ];

  return (
    <div className="rounded-2xl bg-card border border-border p-4 space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Diagnósticos (DEBUG)</h3>
      {rows.map((r) => (
        <div key={r.label} className="flex justify-between text-xs">
          <span className="text-muted-foreground">{r.label}</span>
          <span className="text-foreground font-mono text-[11px]">{r.value}</span>
        </div>
      ))}
    </div>
  );
}
