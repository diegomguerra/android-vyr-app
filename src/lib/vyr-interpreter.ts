import type { VYRState, PillarScore } from './vyr-engine';

export interface Interpretation {
  stateLabel: string;
  contextItems: { text: string; status: 'favorable' | 'attention' | 'limiting' }[];
  cognitiveWindow: string;
  systemReading: string;
  whyScore: string;
  dayRisk: string;
  limitingFactorText: string;
  systemReadingType: 'insight' | 'warning' | 'positive';
  todayMeans: string[];
  systemDiagnosis: string;
  pillarDescriptions: Record<string, string>;
}

const pillarNames: Record<string, string> = {
  energia: 'Energia',
  clareza: 'Clareza',
  estabilidade: 'Estabilidade',
};

function getPillarStatus(value: number): 'favorable' | 'attention' | 'limiting' {
  if (value >= 4.0) return 'favorable';
  if (value >= 3.0) return 'attention';
  return 'limiting';
}

function getPillarContextText(name: string, value: number): string {
  if (value >= 4.0) return `${name} preservada e disponível.`;
  if (value >= 3.0) return `${name} moderada, requer atenção.`;
  return `${name} reduzida, limita o desempenho.`;
}

function generatePillarDescription(pillar: string, value: number): string {
  if (pillar === 'energia') {
    if (value >= 4.5) return 'Energia elevada e disponível para demandas intensas.';
    if (value >= 3.5) return 'Energia disponível, porém controlada.';
    if (value >= 2.5) return 'Energia moderada. Economia recomendada.';
    return 'Reserva energética baixa. Priorize recuperação.';
  }
  if (pillar === 'clareza') {
    if (value >= 4.5) return 'Clareza cognitiva elevada para decisões complexas.';
    if (value >= 3.5) return 'Clareza funcional para trabalho sustentado.';
    if (value >= 2.5) return 'Clareza parcial. Evite decisões críticas.';
    return 'Clareza comprometida. Foque em tarefas simples.';
  }
  // estabilidade
  if (value >= 4.5) return 'Estabilidade elevada. Sistema resiliente a variações.';
  if (value >= 3.5) return 'Estabilidade adequada para demandas moderadas.';
  if (value >= 2.5) return 'Estabilidade oscilante. Reduza estímulos externos.';
  return 'Instabilidade detectada. Priorize regulação emocional.';
}

function getWhyScore(score: number): string {
  if (score >= 80) return 'O sistema está em condição favorável, com boa integração entre os pilares cognitivos.';
  if (score >= 65) return 'O sistema opera de forma funcional, com capacidade disponível para demandas moderadas.';
  if (score >= 50) return 'O sistema opera com restrições. Alguns pilares não sustentam demandas elevadas.';
  return 'O sistema está em modo de conservação. A capacidade disponível é limitada.';
}

function getLimitingFactorText(pillar: string, value: number): string {
  const name = pillarNames[pillar]?.toLowerCase() || pillar;
  if (value >= 4) return `O fator limitante é ${name}, mas está em nível adequado.`;
  if (value >= 3) return `O fator limitante é ${name}, com margem para oscilação.`;
  return `O fator limitante é ${name}, impactando diretamente o desempenho.`;
}

function getDayRisk(pillars: PillarScore, score: number): string {
  if (pillars.estabilidade < 2.5) return 'Risco de oscilação emocional ao longo do dia.';
  if (pillars.energia < 2.5) return 'Risco de fadiga antes do final do dia.';
  if (score < 50) return 'Dia requer gestão cuidadosa de energia.';
  return 'Sem riscos significativos detectados.';
}

function getSystemReadingType(score: number): 'insight' | 'warning' | 'positive' {
  if (score >= 70) return 'positive';
  if (score >= 50) return 'insight';
  return 'warning';
}

function getRichLabel(score: number, pillars: PillarScore): string {
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

export function interpret(state: VYRState): Interpretation {
  const { pillars, limitingFactor, phase, score } = state;

  // Context items
  const contextItems: Interpretation['contextItems'] = [
    { text: getPillarContextText('Energia', pillars.energia), status: getPillarStatus(pillars.energia) },
    { text: getPillarContextText('Clareza', pillars.clareza), status: getPillarStatus(pillars.clareza) },
    { text: getPillarContextText('Estabilidade', pillars.estabilidade), status: getPillarStatus(pillars.estabilidade) },
  ];

  // Cognitive window
  let windowText: string;
  if (score >= 75 && pillars.clareza >= 4 && pillars.estabilidade >= 3.5) {
    windowText = 'Janela cognitiva estimada: 3–4h';
  } else if (score >= 65 && pillars.clareza >= 3.5 && pillars.estabilidade >= 3) {
    windowText = 'Janela cognitiva estimada: 2–3h';
  } else if (score >= 55 && pillars.clareza >= 3) {
    windowText = 'Janela cognitiva estimada: 1–2h';
  } else {
    windowText = 'Janela cognitiva indisponível no momento.';
  }
  const windowPhase = phase === 'BOOT' ? ' pela manhã' : phase === 'HOLD' ? ' no início da tarde' : '';
  const cognitiveWindow = windowText + windowPhase;

  // Separated system reading fields
  const whyScore = getWhyScore(score);
  const limitingFactorText = getLimitingFactorText(limitingFactor, pillars[limitingFactor as keyof PillarScore]);
  const dayRisk = getDayRisk(pillars, score);
  const systemReadingType = getSystemReadingType(score);
  const systemReading = `${whyScore} ${limitingFactorText} ${dayRisk}`;

  // Today means
  let todayMeans: string[];
  if (score >= 80) {
    todayMeans = [
      'Boa capacidade para trabalho profundo e contínuo.',
      'O sistema suporta demandas intensas com menor desgaste.',
    ];
  } else if (score >= 65) {
    todayMeans = [
      'Funcional para rotinas e blocos curtos de foco.',
      'Intercale demandas com pausas para manter o rendimento.',
    ];
  } else if (score >= 50) {
    todayMeans = [
      'Capacidade limitada. Priorize tarefas essenciais.',
      'Evite sobrecarga — o sistema precisa de margem.',
    ];
  } else {
    todayMeans = [
      'Priorize tarefas simples e automáticas.',
      'Foque em recuperação — o sistema precisa de descanso.',
    ];
  }

  // Rich label (sync call — bug fix from line 128)
  const stateLabel = score === 0 ? 'Sem dados' : getRichLabel(score, pillars);

  // Pillar descriptions
  const pillarDescriptions: Record<string, string> = {
    energia: generatePillarDescription('energia', pillars.energia),
    clareza: generatePillarDescription('clareza', pillars.clareza),
    estabilidade: generatePillarDescription('estabilidade', pillars.estabilidade),
  };

  // System diagnosis
  const systemDiagnosis = `Score ${score}/100 indica ${getWhyScore(score).toLowerCase()} ${limitingFactorText} Recomendação: ${
    score >= 70 ? 'aproveite a janela disponível para trabalho de alto valor.' :
    score >= 55 ? 'mantenha ritmo controlado, evitando picos de exigência.' :
    'priorize recuperação e tarefas de baixa demanda cognitiva.'
  }`;

  return {
    stateLabel,
    contextItems,
    cognitiveWindow,
    systemReading,
    whyScore,
    dayRisk,
    limitingFactorText,
    systemReadingType,
    todayMeans,
    systemDiagnosis,
    pillarDescriptions,
  };
}
