// VYR State Engine — Core Algorithm v2
// Implements z-score baseline, dynamic weights, rich labels

export interface BiometricData {
  rhr?: number;           // Resting Heart Rate (bpm)
  sleepDuration?: number; // hours
  sleepQuality?: number;  // 0-100
  spo2?: number;          // 90-100
  sleepRegularity?: number; // deviation in minutes
  awakenings?: number;    // count
  hrvIndex?: number;      // 0-100 (already normalized)
  hrvRawMs?: number;      // ms (SDNN) — raw, will be normalized
  stressLevel?: number;   // 0-100
  tempDeviation?: number; // °C deviation from baseline
  activityLevel?: 'high' | 'moderate' | 'low' | null;
}

export interface PillarScore {
  energia: number;      // 0-5
  clareza: number;      // 0-5
  estabilidade: number; // 0-5
}

export interface VYRState {
  score: number;         // 0-100
  level: string;
  pillars: PillarScore;
  limitingFactor: string;
  phase: 'BOOT' | 'HOLD' | 'CLEAR';
}

export interface BaselineValues {
  rhr?: { mean: number; std: number };
  hrv?: { mean: number; std: number };
  sleepDuration?: { mean: number; std: number };
  sleepQuality?: { mean: number; std: number };
  spo2?: { mean: number; std: number };
}

// Population fallback baseline
export const FALLBACK_BASELINE: Required<BaselineValues> = {
  rhr: { mean: 63, std: 5 },
  hrv: { mean: 55, std: 12 },
  sleepDuration: { mean: 7.0, std: 0.7 },
  sleepQuality: { mean: 60, std: 15 },
  spo2: { mean: 97, std: 1.5 },
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Normalize raw HRV ms to 0-100 index (logarithmic)
 */
export function normalizeHRV(ms: number): number {
  const clamped = clamp(ms, 5, 200);
  return (Math.log(clamped) - Math.log(5)) / (Math.log(200) - Math.log(5)) * 100;
}

/**
 * Validate and clamp biometric values to physiological ranges
 */
export function validateWearableData(data: BiometricData): BiometricData {
  return {
    ...data,
    rhr: data.rhr != null ? clamp(data.rhr, 35, 120) : undefined,
    hrvIndex: data.hrvIndex != null ? clamp(data.hrvIndex, 0, 100) : 
              data.hrvRawMs != null ? normalizeHRV(data.hrvRawMs) : undefined,
    sleepDuration: data.sleepDuration != null ? clamp(data.sleepDuration, 0, 14) : undefined,
    sleepQuality: data.sleepQuality != null ? clamp(data.sleepQuality, 0, 100) : undefined,
    sleepRegularity: data.sleepRegularity != null ? clamp(data.sleepRegularity, -120, 120) : undefined,
    awakenings: data.awakenings != null ? clamp(data.awakenings, 0, 30) : undefined,
    stressLevel: data.stressLevel != null ? clamp(data.stressLevel, 0, 100) : undefined,
    spo2: data.spo2 != null ? clamp(data.spo2, 70, 100) : undefined,
    tempDeviation: data.tempDeviation != null ? clamp(data.tempDeviation, -4, 4) : undefined,
  };
}

/**
 * Compute z-score clamped to [-2, +2]
 */
function zScore(value: number, mean: number, std: number): number {
  if (std < 0.01) return 0;
  return clamp((value - mean) / std, -2, 2);
}

/**
 * Convert z-score to pillar contribution (range -1.5 to +1.5)
 */
function zToPillar(z: number): number {
  return z * 0.75;
}

interface WeightedInput {
  value: number; // pillar contribution
  weight: number;
}

function dynamicWeightedAvg(inputs: WeightedInput[], targetWeight: number, base: number): number {
  if (inputs.length === 0) return base;
  const totalW = inputs.reduce((s, i) => s + i.weight, 0);
  const scale = targetWeight / totalW;
  const contribution = inputs.reduce((s, i) => s + i.value * i.weight * scale, 0) / targetWeight;
  return clamp(base + contribution, 0, 5);
}

export function computePillars(data: BiometricData, baseline?: BaselineValues): PillarScore {
  const validated = validateWearableData(data);
  const bl = { ...FALLBACK_BASELINE, ...baseline };

  // === ENERGIA (base 3.0, target weight 2.5) ===
  const energiaInputs: WeightedInput[] = [];
  if (validated.rhr != null && bl.rhr) {
    // Inverted: below mean = good
    energiaInputs.push({ value: zToPillar(-zScore(validated.rhr, bl.rhr.mean, bl.rhr.std)), weight: 1.0 });
  }
  if (validated.sleepDuration != null && bl.sleepDuration) {
    energiaInputs.push({ value: zToPillar(zScore(validated.sleepDuration, bl.sleepDuration.mean, bl.sleepDuration.std)), weight: 1.0 });
  }
  if (validated.sleepQuality != null && bl.sleepQuality) {
    energiaInputs.push({ value: zToPillar(zScore(validated.sleepQuality, bl.sleepQuality.mean, bl.sleepQuality.std)), weight: 0.5 });
  }
  if (validated.spo2 != null && bl.spo2) {
    energiaInputs.push({ value: zToPillar(zScore(validated.spo2, bl.spo2.mean, bl.spo2.std)), weight: 0.4 });
  }

  let energia = dynamicWeightedAvg(energiaInputs, 2.5, 3.0);
  // Activity adjustment
  if (validated.activityLevel === 'high') energia = clamp(energia - 0.5, 0, 5);
  else if (validated.activityLevel === 'low') energia = clamp(energia + 0.25, 0, 5);

  // === CLAREZA (base 3.0, target weight 2.5) ===
  const clarezaInputs: WeightedInput[] = [];
  if (validated.sleepRegularity != null) {
    // Inverted: less variation = better
    const regZ = zScore(Math.abs(validated.sleepRegularity), 30, 20);
    clarezaInputs.push({ value: zToPillar(-regZ), weight: 1.0 });
  }
  if (validated.sleepQuality != null && bl.sleepQuality) {
    clarezaInputs.push({ value: zToPillar(zScore(validated.sleepQuality, bl.sleepQuality.mean, bl.sleepQuality.std)), weight: 1.0 });
  }
  if (validated.awakenings != null) {
    // Inverted: less = better
    const awkZ = zScore(validated.awakenings, 3, 2);
    clarezaInputs.push({ value: zToPillar(-awkZ), weight: 0.5 });
  }

  const clareza = dynamicWeightedAvg(clarezaInputs, 2.5, 3.0);

  // === ESTABILIDADE (base 3.0, target weight 2.0) ===
  const estabInputs: WeightedInput[] = [];
  if (validated.hrvIndex != null && bl.hrv) {
    estabInputs.push({ value: zToPillar(zScore(validated.hrvIndex, bl.hrv.mean, bl.hrv.std)), weight: 1.3 });
  }
  if (validated.stressLevel != null) {
    // Inverted: lower stress = better
    const stressZ = zScore(validated.stressLevel, 40, 15);
    estabInputs.push({ value: zToPillar(-stressZ), weight: 0.7 });
  }
  if (validated.tempDeviation != null) {
    // Absolute deviation = instability
    const tempZ = zScore(Math.abs(validated.tempDeviation), 0.2, 0.3);
    estabInputs.push({ value: zToPillar(-tempZ), weight: 0.3 });
  }

  const estabilidade = dynamicWeightedAvg(estabInputs, 2.0, 3.0);

  return {
    energia: Math.round(energia * 100) / 100,
    clareza: Math.round(clareza * 100) / 100,
    estabilidade: Math.round(estabilidade * 100) / 100,
  };
}

export function computeScore(pillars: PillarScore): number {
  const avg = (pillars.energia + pillars.clareza + pillars.estabilidade) / 3;
  const min = Math.min(pillars.energia, pillars.clareza, pillars.estabilidade);
  return Math.round((avg * 0.6 + min * 0.4) / 5 * 100);
}

export function getLevel(score: number): string {
  if (score >= 85) return 'Ótimo';
  if (score >= 70) return 'Bom';
  if (score >= 55) return 'Moderado';
  if (score >= 40) return 'Baixo';
  return 'Crítico';
}

export function getLimitingFactor(pillars: PillarScore): string {
  const min = Math.min(pillars.energia, pillars.clareza, pillars.estabilidade);
  if (pillars.energia === min) return 'energia';
  if (pillars.clareza === min) return 'clareza';
  return 'estabilidade';
}

export function getCurrentPhase(): 'BOOT' | 'HOLD' | 'CLEAR' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'BOOT';
  if (hour >= 11 && hour < 17) return 'HOLD';
  return 'CLEAR';
}

/**
 * Rich state labels based on score + dominant pillar
 */
export function getRichLabel(score: number, pillars: PillarScore): string {
  const dominant = pillars.energia >= pillars.clareza && pillars.energia >= pillars.estabilidade
    ? 'energia' : pillars.clareza >= pillars.estabilidade ? 'clareza' : 'estabilidade';

  if (score >= 85) {
    return dominant === 'energia' ? 'Energia plena' : dominant === 'clareza' ? 'Foco sustentado' : 'Equilíbrio elevado';
  }
  if (score >= 70) {
    return dominant === 'energia' ? 'Energia estável' : dominant === 'clareza' ? 'Clareza disponível' : 'Sustentação adequada';
  }
  if (score >= 55) {
    return dominant === 'energia' ? 'Energia moderada' : dominant === 'clareza' ? 'Foco instável' : 'Clareza parcial';
  }
  if (score >= 45) {
    return dominant === 'energia' ? 'Reserva baixa' : dominant === 'clareza' ? 'Oscilação detectada' : 'Sustentação necessária';
  }
  return dominant === 'energia' ? 'Esgotamento energético' : dominant === 'clareza' ? 'Instabilidade elevada' : 'Recuperação necessária';
}

/**
 * Recommended action based on context
 */
export function getRecommendedAction(pillars: PillarScore, score: number, actionsTaken: string[]): 'BOOT' | 'HOLD' | 'CLEAR' {
  const hour = new Date().getHours();

  // Night: always CLEAR
  if (hour >= 22 || hour < 5) return 'CLEAR';

  // Critical state: CLEAR
  if (score < 45 || pillars.energia <= 2 || pillars.estabilidade <= 2) return 'CLEAR';

  // Morning
  if (hour >= 5 && hour < 11) {
    if (!actionsTaken.includes('BOOT') && (pillars.energia >= 3.5 || score >= 65)) return 'BOOT';
    if (actionsTaken.includes('BOOT')) return 'HOLD';
  }

  // Afternoon
  if (hour >= 11 && hour < 17) {
    if (score >= 55 && !actionsTaken.includes('HOLD')) return 'HOLD';
    if (actionsTaken.includes('HOLD')) return 'CLEAR';
  }

  // Evening
  if (hour >= 17) return 'CLEAR';

  // Fallback
  if (score >= 65) return 'BOOT';
  if (score >= 55) return 'HOLD';
  return 'CLEAR';
}

export function computeState(data: BiometricData, baseline?: BaselineValues): VYRState {
  const pillars = computePillars(data, baseline);
  const score = computeScore(pillars);
  return {
    score,
    level: getLevel(score),
    pillars,
    limitingFactor: getLimitingFactor(pillars),
    phase: getCurrentPhase(),
  };
}

// Demo data for preview
export function getDemoState(): VYRState {
  return computeState({
    rhr: 58,
    sleepDuration: 7.2,
    sleepQuality: 72,
    spo2: 97,
    sleepRegularity: 25,
    awakenings: 2,
    hrvRawMs: 45,
    stressLevel: 35,
    tempDeviation: 0.3,
  });
}
