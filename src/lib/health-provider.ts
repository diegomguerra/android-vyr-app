/**
 * health-provider.ts
 * Camada de abstração que unifica iOS (HealthKit via @capgo + VYRHealthBridge)
 * e Android (Health Connect via capacitor-health by mley).
 */

export type HealthAuthorizationStatus =
  | 'notDetermined'
  | 'sharingDenied'
  | 'sharingAuthorized'
  | 'unknown';

export interface BridgeSample {
  value: number;
  startDate: string;
  endDate: string;
  [key: string]: unknown;
}

export interface SleepSample {
  startDate: string;
  endDate: string;
  sleepState?: string;
  value: number;
}

export interface IHealthProvider {
  isAvailable(): Promise<boolean>;
  requestPermissions(): Promise<boolean>;

  readSteps(startDate: string, endDate: string, limit?: number): Promise<BridgeSample[]>;
  readHeartRate(startDate: string, endDate: string, limit?: number): Promise<BridgeSample[]>;
  readRestingHeartRate(startDate: string, endDate: string, limit?: number): Promise<BridgeSample[]>;
  readHRV(startDate: string, endDate: string, limit?: number): Promise<BridgeSample[]>;
  readSpO2(startDate: string, endDate: string, limit?: number): Promise<BridgeSample[]>;
  readRespiratoryRate(startDate: string, endDate: string, limit?: number): Promise<BridgeSample[]>;
  readSleep(startDate: string, endDate: string, limit?: number): Promise<SleepSample[]>;

  writeBodyTemperature(value: number, startDate: string, endDate?: string): Promise<boolean>;
  writeBloodPressure(systolic: number, diastolic: number, startDate: string, endDate?: string): Promise<boolean>;
  writeVO2Max(value: number, startDate: string, endDate?: string): Promise<boolean>;
  writeActiveEnergyBurned(value: number, startDate: string, endDate?: string): Promise<boolean>;

  getSourceProvider(): string;
}

/** Detecta plataforma atual do Capacitor */
export function getPlatform(): 'ios' | 'android' | 'web' {
  const cap = (window as any).Capacitor;
  if (!cap?.isNativePlatform?.()) return 'web';
  const platform = cap.getPlatform?.() ?? '';
  if (platform === 'android') return 'android';
  if (platform === 'ios') return 'ios';
  return 'web';
}
