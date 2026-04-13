import { describe, it, expect } from 'vitest';
import { computePillars, computeScoreV4, normalizeHRV, validateWearableData, FALLBACK_BASELINE } from '../lib/vyr-engine';
import { convertHRVtoScale } from '../lib/healthkit';

describe('HRV normalization consistency', () => {
  it('normalizeHRV and convertHRVtoScale produce identical results', () => {
    for (const ms of [10, 20, 30, 45, 60, 80, 120, 180]) {
      const a = normalizeHRV(ms);
      const b = convertHRVtoScale(ms);
      expect(Math.abs(a - b)).toBeLessThan(1); // rounding diff only
    }
  });

  it('HRV index is on 0-100 scale', () => {
    expect(normalizeHRV(5)).toBeCloseTo(0, 0);
    expect(normalizeHRV(200)).toBeCloseTo(100, 0);
    expect(normalizeHRV(45)).toBeGreaterThan(20);
    expect(normalizeHRV(45)).toBeLessThan(70);
  });
});

describe('HRV z-score uses correct scale (0-100 index, not raw ms)', () => {
  it('FALLBACK_BASELINE.hrv is calibrated for 0-100 index', () => {
    const bl = FALLBACK_BASELINE.hrv;
    expect(bl.mean).toBeGreaterThanOrEqual(30);
    expect(bl.mean).toBeLessThanOrEqual(80);
    expect(bl.std).toBeGreaterThanOrEqual(5);
    expect(bl.std).toBeLessThanOrEqual(20);
  });

  it('estabilidade pillar responds correctly to HRV index', () => {
    const baseline = FALLBACK_BASELINE;

    // Average HRV (45ms → index ~60) should produce reasonable estabilidade
    const avgHrvMs = 45;
    const avgIndex = normalizeHRV(avgHrvMs);
    const pillarsAvg = computePillars({ hrvIndex: avgIndex, rhr: 65, sleepDuration: 7, sleepQuality: 60 }, baseline);
    expect(pillarsAvg.estabilidade).toBeGreaterThan(1.5);
    expect(pillarsAvg.estabilidade).toBeLessThan(4.0);

    // High HRV (80ms → index ~77) should produce higher estabilidade
    const highIndex = normalizeHRV(80);
    const pillarsHigh = computePillars({ hrvIndex: highIndex, rhr: 65, sleepDuration: 7, sleepQuality: 60 }, baseline);
    expect(pillarsHigh.estabilidade).toBeGreaterThan(pillarsAvg.estabilidade);

    // Low HRV (15ms → index ~30) should produce lower estabilidade
    const lowIndex = normalizeHRV(15);
    const pillarsLow = computePillars({ hrvIndex: lowIndex, rhr: 65, sleepDuration: 7, sleepQuality: 60 }, baseline);
    expect(pillarsLow.estabilidade).toBeLessThan(pillarsAvg.estabilidade);
  });
});

describe('SpO2 contributes to energia pillar', () => {
  it('higher SpO2 produces higher energia', () => {
    const baseline = FALLBACK_BASELINE;
    const base = { rhr: 65, sleepDuration: 7, sleepQuality: 60, hrvIndex: 55 };

    const pillarsNoSpo2 = computePillars({ ...base }, baseline);
    const pillarsHighSpo2 = computePillars({ ...base, spo2: 99 }, baseline);
    const pillarsLowSpo2 = computePillars({ ...base, spo2: 92 }, baseline);

    // High SpO2 should boost energia vs no SpO2
    expect(pillarsHighSpo2.energia).toBeGreaterThanOrEqual(pillarsNoSpo2.energia);
    // Low SpO2 should reduce energia vs high SpO2
    expect(pillarsLowSpo2.energia).toBeLessThan(pillarsHighSpo2.energia);
  });

  it('SpO2 is clamped to 70-100 range', () => {
    const data = validateWearableData({ spo2: 65 });
    expect(data.spo2).toBe(70);

    const data2 = validateWearableData({ spo2: 97 });
    expect(data2.spo2).toBe(97);
  });
});

describe('computeScoreV4 geometric mean', () => {
  it('balanced pillars score higher than imbalanced', () => {
    const balanced = computeScoreV4({ energia: 3.5, clareza: 3.5, estabilidade: 3.5 });
    const imbalanced = computeScoreV4({ energia: 5, clareza: 5, estabilidade: 1 });
    expect(balanced).toBeGreaterThan(imbalanced);
  });

  it('all pillars at 2.5 (baseline) produce ~50 score', () => {
    const score = computeScoreV4({ energia: 2.5, clareza: 2.5, estabilidade: 2.5 });
    expect(score).toBeGreaterThan(35);
    expect(score).toBeLessThan(65);
  });
});
