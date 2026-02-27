/**
 * health-ios.ts
 * Implementação do IHealthProvider para iOS usando:
 * - @capgo/capacitor-health (steps, heartRate, sleep)
 * - VYRHealthBridge (resting HR, HRV, SpO2, respiratory rate + writes especiais)
 */

import type { IHealthProvider, BridgeSample, SleepSample } from './health-provider';
import { VYRHealthBridge } from './healthkit-bridge';

const PLUGIN_READ_TYPES = ['heartRate', 'sleep', 'steps'] as const;
const PLUGIN_WRITE_TYPES = ['steps', 'heartRate', 'sleep'] as const;

async function getHealth() {
  // @ts-ignore - @capgo/capacitor-health is only available on native iOS builds
  const mod = await import('@capgo/capacitor-health');
  return mod.Health;
}

function bridgeToSamples(samples: Array<Record<string, unknown>>): BridgeSample[] {
  return samples.map(s => ({
    value: Number(s.value ?? 0),
    startDate: String(s.startDate ?? ''),
    endDate: String(s.endDate ?? ''),
    ...s,
  }));
}

export class IOSHealthProvider implements IHealthProvider {
  getSourceProvider(): string {
    return 'apple_health';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const Health = await getHealth();
      const result = await Health.isAvailable();
      return result.available;
    } catch (e) {
      console.error('[health-ios] isAvailable failed:', e);
      return false;
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const Health = await getHealth();
      await Health.requestAuthorization({ read: [...PLUGIN_READ_TYPES], write: [...PLUGIN_WRITE_TYPES] });
      await VYRHealthBridge.requestAuthorization({
        readTypes: ['restingHeartRate', 'heartRateVariability', 'oxygenSaturation', 'respiratoryRate'],
        writeTypes: [],
      });
      return true;
    } catch (e) {
      console.error('[health-ios] requestPermissions failed:', e);
      return false;
    }
  }

  async readSteps(startDate: string, endDate: string, limit = 500): Promise<BridgeSample[]> {
    try {
      const Health = await getHealth();
      const result = await Health.readSamples({ dataType: 'steps', startDate, endDate, limit });
      return (result.samples ?? []).map((s: any) => ({ value: Number(s.value ?? 0), startDate: s.startDate, endDate: s.endDate }));
    } catch (e) {
      console.warn('[health-ios] readSteps failed:', e);
      return [];
    }
  }

  async readHeartRate(startDate: string, endDate: string, limit = 500): Promise<BridgeSample[]> {
    try {
      const Health = await getHealth();
      const result = await Health.readSamples({ dataType: 'heartRate', startDate, endDate, limit });
      return (result.samples ?? []).map((s: any) => ({ value: Number(s.value ?? 0), startDate: s.startDate, endDate: s.endDate }));
    } catch (e) {
      console.warn('[health-ios] readHeartRate failed:', e);
      return [];
    }
  }

  async readRestingHeartRate(_startDate: string, _endDate: string, limit = 500): Promise<BridgeSample[]> {
    try {
      const res = await VYRHealthBridge.readAnchored({ type: 'restingHeartRate', limit });
      return bridgeToSamples(res.samples);
    } catch (e) {
      console.warn('[health-ios] readRestingHeartRate failed:', e);
      return [];
    }
  }

  async readHRV(_startDate: string, _endDate: string, limit = 500): Promise<BridgeSample[]> {
    try {
      const res = await VYRHealthBridge.readAnchored({ type: 'heartRateVariability', limit });
      return bridgeToSamples(res.samples);
    } catch (e) {
      console.warn('[health-ios] readHRV failed:', e);
      return [];
    }
  }

  async readSpO2(_startDate: string, _endDate: string, limit = 500): Promise<BridgeSample[]> {
    try {
      const res = await VYRHealthBridge.readAnchored({ type: 'oxygenSaturation', limit });
      return bridgeToSamples(res.samples);
    } catch (e) {
      console.warn('[health-ios] readSpO2 failed:', e);
      return [];
    }
  }

  async readRespiratoryRate(_startDate: string, _endDate: string, limit = 500): Promise<BridgeSample[]> {
    try {
      const res = await VYRHealthBridge.readAnchored({ type: 'respiratoryRate', limit });
      return bridgeToSamples(res.samples);
    } catch (e) {
      console.warn('[health-ios] readRespiratoryRate failed:', e);
      return [];
    }
  }

  async readSleep(startDate: string, endDate: string, limit = 500): Promise<SleepSample[]> {
    try {
      const Health = await getHealth();
      const result = await Health.readSamples({ dataType: 'sleep', startDate, endDate, limit });
      return (result.samples ?? []).map((s: any) => ({ value: 0, startDate: s.startDate, endDate: s.endDate, sleepState: s.sleepState }));
    } catch (e) {
      console.warn('[health-ios] readSleep failed:', e);
      return [];
    }
  }

  async writeBodyTemperature(value: number, startDate: string, endDate?: string): Promise<boolean> {
    try { await VYRHealthBridge.writeBodyTemperature({ value, startDate, endDate }); return true; }
    catch (e) { console.error('[health-ios] writeBodyTemperature failed:', e); return false; }
  }

  async writeBloodPressure(systolic: number, diastolic: number, startDate: string, endDate?: string): Promise<boolean> {
    try { await VYRHealthBridge.writeBloodPressure({ systolic, diastolic, startDate, endDate }); return true; }
    catch (e) { console.error('[health-ios] writeBloodPressure failed:', e); return false; }
  }

  async writeVO2Max(value: number, startDate: string, endDate?: string): Promise<boolean> {
    try { await VYRHealthBridge.writeVO2Max({ value, startDate, endDate }); return true; }
    catch (e) { console.error('[health-ios] writeVO2Max failed:', e); return false; }
  }

  async writeActiveEnergyBurned(value: number, startDate: string, endDate?: string): Promise<boolean> {
    try { await VYRHealthBridge.writeActiveEnergyBurned({ value, startDate, endDate }); return true; }
    catch (e) { console.error('[health-ios] writeActiveEnergyBurned failed:', e); return false; }
  }
}
