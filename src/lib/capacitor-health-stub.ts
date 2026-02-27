/**
 * Stub for @capgo/capacitor-health
 * On web/preview, all methods return safe defaults.
 * On native builds, replace this with the real package.
 */

export type HealthDataType =
  | 'heartRate' | 'sleep' | 'steps'
  | 'restingHeartRate' | 'heartRateVariability'
  | 'oxygenSaturation' | 'respiratoryRate'
  | 'bodyTemperature' | 'vo2Max' | 'activeEnergyBurned'
  | 'bloodPressureSystolic' | 'bloodPressureDiastolic';

export interface HealthSample {
  startDate: string;
  endDate: string;
  value: number;
  sleepState?: 'awake' | 'inBed' | 'asleep' | 'deep' | 'rem' | 'core';
  [key: string]: any;
}

export const Health = {
  async isAvailable(): Promise<{ available: boolean }> {
    return { available: false };
  },
  async requestAuthorization(_opts: { read: HealthDataType[]; write: HealthDataType[] }): Promise<void> {},
  async checkAuthorization(_opts: { read: HealthDataType[]; write: HealthDataType[] }): Promise<{ readAuthorized: HealthDataType[]; readDenied: HealthDataType[] }> {
    return { readAuthorized: [], readDenied: [] };
  },
  async readSamples(_opts: { startDate: string; endDate: string; dataType: HealthDataType; limit?: number }): Promise<{ samples: HealthSample[] }> {
    return { samples: [] };
  },
  async saveSample(_opts: { dataType: HealthDataType; value: number; startDate: string; endDate: string }): Promise<void> {},
};
