import { registerPlugin } from '@capacitor/core';

export type BridgeAuthorizationStatus = 'notDetermined' | 'sharingDenied' | 'sharingAuthorized' | 'unknown';

export interface VYRHealthBridgePlugin {
  isHealthKitAvailable(): Promise<{ available: boolean }>;
  writeBodyTemperature(options: { value: number; startDate: string; endDate?: string }): Promise<{ success: boolean }>;
  writeBloodPressure(options: { systolic: number; diastolic: number; startDate: string; endDate?: string }): Promise<{ success: boolean }>;
  writeVO2Max(options: { value: number; startDate: string; endDate?: string }): Promise<{ success: boolean }>;
  writeActiveEnergyBurned(options: { value: number; startDate: string; endDate?: string }): Promise<{ success: boolean }>;
  getAuthorizationStatuses(options: { types: string[] }): Promise<{ statuses: Record<string, BridgeAuthorizationStatus> }>;
  enableBackgroundDelivery(options: { type: string; frequency?: 'immediate' | 'hourly' | 'daily' }): Promise<{ success: boolean }>;
  registerObserverQueries(options: { types: string[] }): Promise<{ registered: number }>;
  readAnchored(options: { type: string; anchor?: string; limit?: number }): Promise<{ samples: Array<Record<string, unknown>>; newAnchor?: string }>;
  requestAuthorization(options: { readTypes?: string[]; writeTypes?: string[] }): Promise<{ granted: boolean }>;
  addListener(eventName: 'healthkitObserverUpdated', listenerFunc: (event: { type: string }) => void): Promise<{ remove: () => Promise<void> }>;
  addListener(eventName: 'healthkitObserverError', listenerFunc: (event: { type: string; error: string }) => void): Promise<{ remove: () => Promise<void> }>;
}

export const VYRHealthBridge = registerPlugin<VYRHealthBridgePlugin>('VYRHealthBridge');
