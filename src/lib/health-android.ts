/**
 * health-android.ts
 * Implementação do IHealthProvider para Android usando capacitor-health (mley).
 * Suporta Health Connect nativamente (Android 9+ com app instalado, nativo no Android 14+).
 *
 * Package: capacitor-health@8.0.1
 * Código nativo: com.fit_up.health.capacitor
 */

import type { IHealthProvider, BridgeSample, SleepSample } from './health-provider';

const READ_TYPES = [
  'steps',
  'heartRate',
  'restingHeartRate',
  'heartRateVariability',
  'oxygenSaturation',
  'respiratoryRate',
  'sleep',
] as const;

const WRITE_TYPES = [
  'steps',
  'heartRate',
  'sleep',
  'bodyTemperature',
  'bloodPressureSystolic',
  'bloodPressureDiastolic',
  'vo2Max',
  'activeEnergyBurned',
] as const;

async function getHealth() {
  // @ts-ignore - capacitor-health is only available on native Android builds
  const mod = await import('capacitor-health');
  return mod.Health ?? mod.default;
}

async function readSamples(
  type: string,
  startDate: string,
  endDate: string,
  limit = 500,
): Promise<BridgeSample[]> {
  try {
    const Health = await getHealth();
    const result = await Health.readSamples({ dataType: type, startDate, endDate, limit });
    return (result.samples ?? []).map((s: any) => ({
      value: Number(s.value ?? s.quantity ?? 0),
      startDate: s.startDate ?? s.startTime ?? startDate,
      endDate: s.endDate ?? s.endTime ?? endDate,
      ...s,
    }));
  } catch (e) {
    console.warn(`[health-android] readSamples(${type}) failed:`, e);
    return [];
  }
}

export class AndroidHealthProvider implements IHealthProvider {
  getSourceProvider(): string {
    return 'health_connect';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const Health = await getHealth();
      const result = await Health.isAvailable();
      console.log('[health-android] isAvailable raw result:', JSON.stringify(result));
      // capacitor-health pode retornar { available: true }, { value: true }, ou apenas true
      if (typeof result === 'boolean') return result;
      if (typeof result?.available === 'boolean') return result.available;
      if (typeof result?.value === 'boolean') return result.value;
      // Se não jogou erro, considera disponível no Android nativo
      const isNative = !!(window as any).Capacitor?.isNativePlatform?.();
      return isNative;
    } catch (e) {
      console.error('[health-android] isAvailable failed:', e);
      // Fallback: se é nativo Android, tenta mesmo assim
      const isNative = !!(window as any).Capacitor?.isNativePlatform?.();
      return isNative;
    }
  }

  async requestPermissions(): Promise<boolean> {
  try {
    const Health = await getHealth();
    // capacitor-health requer apenas os tipos de leitura no requestAuthorization
    await Health.requestAuthorization({
      read: [...READ_TYPES],
      write: [...WRITE_TYPES],
    });
    console.log('[health-android] permissions requested successfully');
    return true;
  } catch (e: any) {
    console.error('[health-android] requestPermissions failed:', JSON.stringify(e));
    // Erro vazio {} pode significar que o usuário fechou a tela — não é erro fatal
    const errStr = JSON.stringify(e);
    if (errStr === '{}' || errStr === 'null' || !errStr) {
      console.warn('[health-android] permission dialog may have been dismissed, treating as partial success');
      return true;
    }
    return false;
  }
}

  async readSteps(startDate: string, endDate: string, limit = 500): Promise<BridgeSample[]> {
    return readSamples('steps', startDate, endDate, limit);
  }

  async readHeartRate(startDate: string, endDate: string, limit = 500): Promise<BridgeSample[]> {
    return readSamples('heartRate', startDate, endDate, limit);
  }

  async readRestingHeartRate(startDate: string, endDate: string, limit = 500): Promise<BridgeSample[]> {
    return readSamples('restingHeartRate', startDate, endDate, limit);
  }

  async readHRV(startDate: string, endDate: string, limit = 500): Promise<BridgeSample[]> {
    return readSamples('heartRateVariability', startDate, endDate, limit);
  }

  async readSpO2(startDate: string, endDate: string, limit = 500): Promise<BridgeSample[]> {
    return readSamples('oxygenSaturation', startDate, endDate, limit);
  }

  async readRespiratoryRate(startDate: string, endDate: string, limit = 500): Promise<BridgeSample[]> {
    return readSamples('respiratoryRate', startDate, endDate, limit);
  }

  async readSleep(startDate: string, endDate: string, limit = 500): Promise<SleepSample[]> {
    try {
      const Health = await getHealth();
      const result = await Health.readSamples({ dataType: 'sleep', startDate, endDate, limit });
      return (result.samples ?? []).map((s: any) => ({
        value: 0,
        startDate: s.startDate ?? s.startTime ?? startDate,
        endDate: s.endDate ?? s.endTime ?? endDate,
        sleepState: mapAndroidSleepStage(s.sleepState ?? s.stage ?? s.value),
        ...s,
      }));
    } catch (e) {
      console.warn('[health-android] readSleep failed:', e);
      return [];
    }
  }

  async writeBodyTemperature(value: number, startDate: string, endDate?: string): Promise<boolean> {
    return writeSample('bodyTemperature', value, startDate, endDate);
  }

  async writeBloodPressure(systolic: number, diastolic: number, startDate: string, endDate?: string): Promise<boolean> {
    try {
      const Health = await getHealth();
      await Health.saveSample({ dataType: 'bloodPressureSystolic', value: systolic, startDate, endDate: endDate ?? startDate });
      await Health.saveSample({ dataType: 'bloodPressureDiastolic', value: diastolic, startDate, endDate: endDate ?? startDate });
      return true;
    } catch (e) {
      console.error('[health-android] writeBloodPressure failed:', e);
      return false;
    }
  }

  async writeVO2Max(value: number, startDate: string, endDate?: string): Promise<boolean> {
    return writeSample('vo2Max', value, startDate, endDate);
  }

  async writeActiveEnergyBurned(value: number, startDate: string, endDate?: string): Promise<boolean> {
    return writeSample('activeEnergyBurned', value, startDate, endDate);
  }
}

async function writeSample(type: string, value: number, startDate: string, endDate?: string): Promise<boolean> {
  try {
    const Health = await getHealth();
    await Health.saveSample({ dataType: type, value, startDate, endDate: endDate ?? startDate });
    return true;
  } catch (e) {
    console.error(`[health-android] writeSample(${type}) failed:`, e);
    return false;
  }
}

function mapAndroidSleepStage(stage: string | number | undefined): string {
  if (stage === undefined || stage === null) return 'asleep';
  const s = String(stage).toLowerCase();
  if (s === '0' || s === 'awake') return 'awake';
  if (s === '2' || s === 'out_of_bed' || s === 'outofbed') return 'inBed';
  if (s === '4' || s === 'deep') return 'deep';
  if (s === '5' || s === 'rem') return 'rem';
  if (s === '3' || s === 'light' || s === '1' || s === 'sleeping') return 'core';
  return 'asleep';
}
