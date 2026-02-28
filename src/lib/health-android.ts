import type { IHealthProvider, BridgeSample, SleepSample } from './health-provider';
import { registerPlugin } from '@capacitor/core';

const HealthConnect = registerPlugin<any>('HealthConnect');

export class AndroidHealthProvider implements IHealthProvider {
  getSourceProvider(): string {
    return 'health_connect';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const result = await HealthConnect.isAvailable();
      console.log('[health-android] isAvailable:', JSON.stringify(result));
      return result?.available === true;
    } catch (e) {
      console.error('[health-android] isAvailable error:', e);
      return false;
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const result = await HealthConnect.requestPermissions();
      console.log('[health-android] requestPermissions:', JSON.stringify(result));
      return true;
    } catch (e) {
      console.error('[health-android] requestPermissions error:', e);
      return false;
    }
  }

  async readSteps(startDate: string, endDate: string): Promise<BridgeSample[]> {
    try {
      const result = await HealthConnect.readSteps({ startDate, endDate });
      return result?.samples ?? [];
    } catch (e) {
      console.warn('[health-android] readSteps error:', e);
      return [];
    }
  }

  async readHeartRate(startDate: string, endDate: string): Promise<BridgeSample[]> {
    try {
      const result = await HealthConnect.readHeartRate({ startDate, endDate });
      return result?.samples ?? [];
    } catch (e) {
      console.warn('[health-android] readHeartRate error:', e);
      return [];
    }
  }

  async readRestingHeartRate(startDate: string, endDate: string): Promise<BridgeSample[]> {
    try {
      const result = await HealthConnect.readRestingHeartRate({ startDate, endDate });
      return result?.samples ?? [];
    } catch (e) {
      console.warn('[health-android] readRestingHeartRate error:', e);
      return [];
    }
  }

  async readHRV(startDate: string, endDate: string): Promise<BridgeSample[]> {
    try {
      const result = await HealthConnect.readHRV({ startDate, endDate });
      return result?.samples ?? [];
    } catch (e) {
      console.warn('[health-android] readHRV error:', e);
      return [];
    }
  }

  async readSpO2(startDate: string, endDate: string): Promise<BridgeSample[]> {
    try {
      const result = await HealthConnect.readSpO2({ startDate, endDate });
      return result?.samples ?? [];
    } catch (e) {
      console.warn('[health-android] readSpO2 error:', e);
      return [];
    }
  }

  async readRespiratoryRate(startDate: string, endDate: string): Promise<BridgeSample[]> {
    try {
      const result = await HealthConnect.readRestingHeartRate({ startDate, endDate });
      return result?.samples ?? [];
    } catch (e) {
      console.warn('[health-android] readRespiratoryRate error:', e);
      return [];
    }
  }

  async readSleep(startDate: string, endDate: string): Promise<SleepSample[]> {
    try {
      const result = await HealthConnect.readSleep({ startDate, endDate });
      return (result?.samples ?? []).map((s: any) => ({
        ...s,
        sleepState: 'asleep',
      }));
    } catch (e) {
      console.warn('[health-android] readSleep error:', e);
      return [];
    }
  }

  async writeBodyTemperature(): Promise<boolean> { return false; }
  async writeBloodPressure(): Promise<boolean> { return false; }
  async writeVO2Max(): Promise<boolean> { return false; }
  async writeActiveEnergyBurned(): Promise<boolean> { return false; }
}