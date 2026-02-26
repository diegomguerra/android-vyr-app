/** Wearable types — production contract */

/** Supported wearable models */
export type WearableModel = 'X3' | 'J5Vital';

/** Device discovered during BLE scan */
export interface WearableDevice {
  deviceId: string;
  name: string;
  mac?: string;
  rssi?: number;
  vendor: string;
  model: string;
}

/** Connection status */
export type WearableStatus =
  | 'idle'
  | 'scanning'
  | 'connected'
  | 'syncing'
  | 'disconnected'
  | 'error';

/** Core biomarker types (shared X3 + V5) */
export type BiomarkerTypeCore =
  | 'sleep'
  | 'hrv'
  | 'spo2'
  | 'temp'
  | 'steps'
  | 'hr';

/** Extended biomarker types (V5 only, feature-flagged) */
export type BiomarkerTypeV5 =
  | 'ecg_history'
  | 'ecg_raw'
  | 'ppg'
  | 'ppi'
  | 'rr_interval';

/** All biomarker types */
export type BiomarkerType = BiomarkerTypeCore | BiomarkerTypeV5;

/** Single biomarker sample */
export interface BiomarkerSample {
  type: BiomarkerType;
  ts: string;
  end_ts?: string | null;
  value?: number | null;
  payload?: Record<string, unknown>;
  source?: string;
}

/** Sync progress per biomarker type */
export interface SyncProgress {
  type: BiomarkerType;
  status: 'pending' | 'syncing' | 'done' | 'error';
  count?: number;
}

/** Device diagnostics */
export interface DeviceDiagnostics {
  deviceId: string;
  mac?: string;
  fwVersion?: string;
  battery?: number;
  lastError?: string;
  lastSync?: string;
}

/** Wearable event signatures */
export interface WearableEvents {
  onDeviceFound: (device: WearableDevice) => void;
  onConnected: (device: WearableDevice) => void;
  onData: (type: BiomarkerType, payload: BiomarkerSample[]) => void;
  onSyncEnd: (type: BiomarkerType) => void;
  onError: (code: string, message: string) => void;
}

/** Adapter contract — any wearable plugin must implement this */
export interface WearableAdapter {
  scan(): Promise<void>;
  stopScan(): Promise<void>;
  connect(deviceId: string): Promise<boolean>;
  disconnect(): Promise<void>;
  sync(options?: { since?: string }): Promise<void>;
  enableRealtime(type: BiomarkerType): Promise<void>;
  getDiagnostics(): DeviceDiagnostics | null;
  isAvailable(): Promise<boolean>;
  on<K extends keyof WearableEvents>(event: K, handler: WearableEvents[K]): void;
  off<K extends keyof WearableEvents>(event: K, handler: WearableEvents[K]): void;
}

/** Batch ingest payload */
export interface IngestBatchPayload {
  vendor: string;
  model: string;
  device_uid: string;
  fw_version?: string | null;
  samples: BiomarkerSample[];
}

/** Ingest response */
export interface IngestBatchResponse {
  success: boolean;
  device_id?: string;
  inserted: number;
  duplicates: number;
  errors: number;
  types: string[];
}

/** V5 feature flags */
export const V5_EXTENDED_TYPES: BiomarkerTypeV5[] = [
  'ecg_history', 'ecg_raw', 'ppg', 'ppi', 'rr_interval',
];

/** Core types shared by all models */
export const CORE_BIOMARKER_TYPES: BiomarkerTypeCore[] = [
  'sleep', 'hrv', 'spo2', 'temp', 'steps', 'hr',
];

/** Check if V5 extended types are enabled */
export function isV5ExtendedEnabled(): boolean {
  return import.meta.env.VITE_V5_EXTENDED === 'true';
}
