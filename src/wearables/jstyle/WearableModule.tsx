/**
 * WearableModule — Main wearable integration screen (production).
 * Supports X3 ring and J5Vital bracelet.
 */

import { useState, useEffect } from 'react';
import { Bluetooth, Loader2, RefreshCw, Check, AlertCircle, Unplug, Info, Watch } from 'lucide-react';
import { wearableStore } from './wearable.store';
import { flushSamplesToBackend } from './wearable.sync';
import { isDebugEnabled } from './wearable.telemetry';
import type { BiomarkerType, WearableModel } from './wearable.types';
import { toast } from 'sonner';
import WearableModelPicker from './WearableModelPicker';
import WearableSyncPanel from './WearableSyncPanel';
import WearableDiagnostics from './WearableDiagnostics';

const BIOMARKER_LABELS: Record<string, string> = {
  sleep: 'Sono',
  hrv: 'HRV',
  spo2: 'SpO₂',
  temp: 'Temperatura',
  steps: 'Passos',
  hr: 'Frequência Cardíaca',
  ecg_history: 'ECG (Histórico)',
  ecg_raw: 'ECG (Raw)',
  ppg: 'PPG',
  ppi: 'PPI',
  rr_interval: 'Intervalo RR',
};

export { BIOMARKER_LABELS };

export default function WearableModule() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    return wearableStore.subscribe(() => forceUpdate((n) => n + 1));
  }, []);

  const enabled = import.meta.env.VITE_JSTYLE_ENABLED !== 'false';
  if (!enabled) return null;

  const state = wearableStore.getState();
  const { status, devices, connectedDevice, lastSyncAt, selectedModel } = state;

  const isScanning = status === 'scanning';

  const handleScan = () => isScanning ? wearableStore.stopScan() : wearableStore.scan();
  const handleConnect = async (id: string) => {
    const ok = await wearableStore.connect(id);
    if (!ok) toast.error('Falha ao conectar ao dispositivo');
  };
  const handleDisconnect = () => wearableStore.disconnect();

  const modelLabel = selectedModel === 'J5Vital' ? 'J-Style J5Vital' : 'J-Style Ring X3';
  const modelIcon = selectedModel === 'J5Vital' ? Watch : Bluetooth;
  const ModelIcon = modelIcon;

  return (
    <div className="space-y-4">
      {/* --- Model Picker --- */}
      {!connectedDevice && (
        <WearableModelPicker
          selected={selectedModel}
          onSelect={(m) => wearableStore.selectModel(m)}
        />
      )}

      {/* --- Scanner / Connection --- */}
      <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <ModelIcon size={20} className="text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">{modelLabel}</h3>
            <p className="text-xs text-muted-foreground">
              {connectedDevice
                ? `Conectado: ${connectedDevice.name}`
                : isScanning
                  ? 'Procurando…'
                  : 'Não conectado'}
            </p>
          </div>
          {connectedDevice && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/15 text-primary">
              Ativo
            </span>
          )}
        </div>

        {lastSyncAt && (
          <p className="text-[10px] text-muted-foreground">
            Última sincronização: {new Date(lastSyncAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}

        {/* Permissions hint */}
        {!connectedDevice && !isScanning && (
          <div className="flex items-start gap-2 rounded-xl bg-muted/50 p-3">
            <Info size={14} className="text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Para conectar o dispositivo, o app precisará de permissão Bluetooth. No iOS, aceite a solicitação quando aparecer.
            </p>
          </div>
        )}

        {/* Scan button */}
        {!connectedDevice && (
          <button
            onClick={handleScan}
            className="w-full rounded-xl bg-primary text-primary-foreground font-medium py-3 text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            {isScanning && <Loader2 size={16} className="animate-spin" />}
            {isScanning ? 'Parar busca' : 'Procurar dispositivos'}
          </button>
        )}

        {/* Device list */}
        {!connectedDevice && devices.length > 0 && (
          <div className="space-y-2">
            {devices.map((d) => (
              <div key={d.deviceId} className="flex items-center justify-between rounded-xl border border-border p-3">
                <div>
                  <p className="text-xs font-medium text-foreground">{d.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {d.mac ?? d.deviceId}
                    {d.rssi != null && ` · ${d.rssi} dBm`}
                  </p>
                </div>
                <button
                  onClick={() => handleConnect(d.deviceId)}
                  className="text-xs font-medium text-primary px-3 py-1.5 rounded-lg bg-primary/10 active:scale-[0.97]"
                >
                  Conectar
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Connected: disconnect */}
        {connectedDevice && (
          <button
            onClick={handleDisconnect}
            className="w-full rounded-xl border border-border py-2.5 text-xs text-destructive font-medium flex items-center justify-center gap-1.5 active:scale-[0.98]"
          >
            <Unplug size={14} />
            Desconectar
          </button>
        )}
      </div>

      {/* --- Sync Panel --- */}
      {connectedDevice && <WearableSyncPanel />}

      {/* --- Diagnostics (debug only) --- */}
      {isDebugEnabled() && <WearableDiagnostics />}
    </div>
  );
}
