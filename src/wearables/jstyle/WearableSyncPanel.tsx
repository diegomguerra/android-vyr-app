/**
 * WearableSyncPanel — Sync progress and flush button.
 */

import { useState, useEffect } from 'react';
import { Loader2, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { wearableStore } from './wearable.store';
import { flushSamplesToBackend } from './wearable.sync';
import { BIOMARKER_LABELS } from './WearableModule';
import { toast } from 'sonner';

export default function WearableSyncPanel() {
  const [, forceUpdate] = useState(0);
  useEffect(() => wearableStore.subscribe(() => forceUpdate((n) => n + 1)), []);

  const { status, syncProgress } = wearableStore.getState();
  const isSyncing = status === 'syncing';
  const allDone = Array.from(syncProgress.values()).every((p) => p.status === 'done');
  const hasData = Array.from(syncProgress.values()).some((p) => (p.count ?? 0) > 0);

  const handleSync = () => wearableStore.sync();
  const handleFlush = async () => {
    const result = await flushSamplesToBackend();
    if (result) {
      toast.success(`${result.inserted} amostras enviadas, ${result.duplicates} duplicatas ignoradas`);
    } else {
      toast.error('Nenhuma amostra para enviar');
    }
  };

  return (
    <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Sincronização</h3>

      {syncProgress.size > 0 && (
        <div className="space-y-1.5">
          {Array.from(syncProgress.entries()).map(([type, prog]) => (
            <div key={type} className="flex items-center gap-2">
              {prog.status === 'syncing' && <Loader2 size={14} className="animate-spin text-primary" />}
              {prog.status === 'done' && <Check size={14} className="text-primary" />}
              {prog.status === 'error' && <AlertCircle size={14} className="text-destructive" />}
              {prog.status === 'pending' && <div className="w-3.5 h-3.5 rounded-full border border-border" />}
              <span className="text-xs text-foreground flex-1">{BIOMARKER_LABELS[type] ?? type}</span>
              {prog.count != null && prog.count > 0 && (
                <span className="text-[10px] text-muted-foreground">{prog.count}</span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="flex-1 rounded-xl border border-border py-2.5 text-xs font-medium text-foreground flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50"
        >
          <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
          {isSyncing ? 'Sincronizando…' : 'Sincronizar agora'}
        </button>

        {allDone && hasData && (
          <button
            onClick={handleFlush}
            className="rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-xs font-medium active:scale-[0.98]"
          >
            Enviar
          </button>
        )}
      </div>
    </div>
  );
}
