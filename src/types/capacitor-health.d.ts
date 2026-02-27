/**
 * Stub type declarations for @capgo/capacitor-health
 * The actual plugin is only available on native iOS/Android builds.
 */
declare module '@capgo/capacitor-health' {
  export type HealthDataType = 'heartRate' | 'sleep' | 'steps' | 'restingHeartRate' | 'heartRateVariability' | 'oxygenSaturation' | 'respiratoryRate' | 'bodyTemperature' | 'vo2Max' | 'activeEnergyBurned' | 'bloodPressureSystolic' | 'bloodPressureDiastolic';

  export interface HealthSample {
    startDate: string;
    endDate: string;
    value: number;
    sleepState?: 'awake' | 'inBed' | 'asleep' | 'deep' | 'rem' | 'core';
    [key: string]: any;
  }

  export interface HealthPlugin {
    isAvailable(): Promise<{ available: boolean }>;
    requestAuthorization(opts: { read: HealthDataType[]; write: HealthDataType[] }): Promise<void>;
    checkAuthorization(opts: { read: HealthDataType[]; write: HealthDataType[] }): Promise<{ readAuthorized: HealthDataType[]; readDenied: HealthDataType[] }>;
    readSamples(opts: { startDate: string; endDate: string; dataType: HealthDataType; limit?: number }): Promise<{ samples: HealthSample[] }>;
    saveSample(opts: { dataType: HealthDataType; value: number; startDate: string; endDate: string }): Promise<void>;
  }

  export const Health: HealthPlugin;
}
