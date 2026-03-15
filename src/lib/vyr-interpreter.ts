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

// ──────────────────────────────────────────
// Pillar status & context — granular bands
// ──────────────────────────────────────────

function getPillarStatus(value: number): 'favorable' | 'attention' | 'limiting' {
  if (value >= 3.8) return 'favorable';
  if (value >= 2.5) return 'attention';
  return 'limiting';
}

function getPillarContextText(name: string, value: number, phase: string): string {
  const phaseLabel = phase === 'BOOT' ? 'para a manhã' : phase === 'HOLD' ? 'para a tarde' : 'para a noite';
  if (value >= 4.5) return `${name} elevada e pronta ${phaseLabel}.`;
  if (value >= 3.8) return `${name} disponível ${phaseLabel}.`;
  if (value >= 3.0) return `${name} moderada — dosagem pode ajudar.`;
  if (value >= 2.0) return `${name} reduzida, exigindo gestão ativa.`;
  return `${name} muito baixa, limitando o desempenho.`;
}

// ──────────────────────────────────────────
// Pillar descriptions — 5 bands each
// ──────────────────────────────────────────

function generatePillarDescription(pillar: string, value: number, others: PillarScore): string {
  if (pillar === 'energia') {
    if (value >= 4.5) return 'Reserva energética alta. Capacidade para demandas intensas sem comprometer a tarde.';
    if (value >= 3.5) return 'Energia funcional e disponível. Sustenta blocos de trabalho de até 2h com pausas.';
    if (value >= 2.5) return 'Energia moderada. Priorize o essencial e distribua esforço ao longo do dia.';
    if (value >= 1.5) return 'Reserva baixa. O corpo pede economia — reduza estímulos e adie decisões pesadas.';
    return 'Esgotamento energético detectado. Recuperação ativa é a prioridade imediata.';
  }
  if (pillar === 'clareza') {
    if (value >= 4.5) return 'Clareza cognitiva elevada. Momento ideal para decisões complexas e planejamento.';
    if (value >= 3.5) {
      return others.estabilidade >= 3.5
        ? 'Clareza disponível com base estável. Bom momento para trabalho analítico.'
        : 'Clareza disponível mas estabilidade oscila. Trabalhe em blocos curtos.';
    }
    if (value >= 2.5) return 'Clareza parcial — evite multitasking e decisões irreversíveis.';
    if (value >= 1.5) return 'Foco comprometido. Simplifique tarefas e use listas de apoio.';
    return 'Clareza indisponível. Adie decisões importantes e foque em rotinas automáticas.';
  }
  // estabilidade
  if (value >= 4.5) return 'Sistema nervoso resiliente. Alta tolerância a variações e imprevistos.';
  if (value >= 3.5) return 'Estabilidade adequada. Suporta demandas moderadas sem oscilação significativa.';
  if (value >= 2.5) {
    return others.energia >= 3.5
      ? 'Estabilidade oscilante apesar da energia disponível. Evite gatilhos emocionais.'
      : 'Estabilidade e energia reduzidas. Ambiente controlado ajuda a manter o rendimento.';
  }
  if (value >= 1.5) return 'Instabilidade detectada. Reduza estímulos e priorize regulação (respiração, pausa).';
  return 'Instabilidade elevada. O sistema precisa de repouso para se recalibrar.';
}

// ──────────────────────────────────────────
// System reading (why score) — 7 bands
// ──────────────────────────────────────────

function getWhyScore(score: number, pillars: PillarScore, limiting: string): string {
  const limName = pillarNames[limiting]?.toLowerCase() || limiting;
  const spread = Math.max(pillars.energia, pillars.clareza, pillars.estabilidade) -
    Math.min(pillars.energia, pillars.clareza, pillars.estabilidade);
  const balanced = spread < 0.8;

  if (score >= 90) {
    return balanced
      ? 'O sistema está em excelente condição — todos os pilares convergem para um estado ótimo.'
      : `O sistema está forte, puxado principalmente por ${pillarNames[getDominant(pillars)]?.toLowerCase()}. Monitore ${limName} para manter a sustentação.`;
  }
  if (score >= 80) {
    return `Boa integração entre os pilares cognitivos. ${pillarNames[limiting]} está ligeiramente abaixo, mas dentro de margem funcional.`;
  }
  if (score >= 70) {
    return `O sistema opera de forma funcional. ${pillarNames[limiting]} merece atenção para não limitar a tarde.`;
  }
  if (score >= 60) {
    return `Capacidade disponível para demandas moderadas, mas ${limName} impõe um teto. Alterne ritmo e pausa.`;
  }
  if (score >= 50) {
    return `O sistema opera com restrições — ${limName} está abaixo do ideal e reduz a margem de segurança.`;
  }
  if (score >= 35) {
    return `O sistema está em modo de conservação. ${pillarNames[limiting]} precisa de atenção antes que o desempenho caia mais.`;
  }
  return `Capacidade muito limitada. O corpo e a mente pedem recuperação — força adicional pode agravar o cenário.`;
}

// ──────────────────────────────────────────
// Limiting factor — phase-aware
// ──────────────────────────────────────────

function getLimitingFactorText(pillar: string, value: number, phase: string): string {
  const name = pillarNames[pillar]?.toLowerCase() || pillar;
  const phaseAction = phase === 'BOOT'
    ? 'A dose de ativação pode ajudar.'
    : phase === 'HOLD'
      ? 'A dose de sustentação pode estabilizar.'
      : 'A dose de recuperação é recomendada.';

  if (value >= 4.0) return `O fator limitante é ${name}, mas está em nível seguro.`;
  if (value >= 3.0) return `O fator limitante é ${name}, com margem reduzida. ${phaseAction}`;
  if (value >= 2.0) return `O fator limitante é ${name}, impactando diretamente o desempenho. ${phaseAction}`;
  return `O fator limitante é ${name}, em nível crítico. Priorize recuperação.`;
}

// ──────────────────────────────────────────
// Day risk — cross-pillar analysis
// ──────────────────────────────────────────

function getDayRisk(pillars: PillarScore, score: number): string {
  // Multiple risk detections, most specific first
  if (pillars.estabilidade < 2.0 && pillars.energia < 2.0)
    return 'Risco elevado de colapso cognitivo. Mantenha demandas no mínimo absoluto.';
  if (pillars.estabilidade < 2.0)
    return 'Risco de oscilação emocional ao longo do dia. Reduza exposição a decisões sob pressão.';
  if (pillars.energia < 2.0)
    return 'Risco de fadiga acentuada — energia pode se esgotar antes do meio da tarde.';
  if (pillars.clareza < 2.0)
    return 'Risco de erros por falta de clareza. Adie decisões complexas e valide com terceiros.';
  if (pillars.energia < 2.5 && pillars.estabilidade < 2.5)
    return 'Energia e estabilidade baixas — dia requer gestão ativa de pausas e ritmo.';
  if (pillars.estabilidade < 2.5)
    return 'Estabilidade abaixo do ideal — irritabilidade e reatividade podem aumentar.';
  if (pillars.energia < 2.5)
    return 'Energia reduzida — risco de fadiga ao final do expediente.';
  if (pillars.clareza < 2.5)
    return 'Clareza abaixo do ideal — foco sustentado pode ser difícil sem pausas.';
  if (score < 45)
    return 'Dia exige conservação — reduza o número de compromissos e delegue o possível.';
  if (score < 60)
    return 'Dia requer gestão cuidadosa — alterne demanda com pausas curtas.';
  if (score >= 80)
    return 'Sem riscos detectados — bom dia para tarefas de alto valor.';
  return 'Sem riscos significativos — mantenha o ritmo com atenção à hidratação e pausas.';
}

function getSystemReadingType(score: number): 'insight' | 'warning' | 'positive' {
  if (score >= 70) return 'positive';
  if (score >= 45) return 'insight';
  return 'warning';
}

// ──────────────────────────────────────────
// Rich label — now uses limiting pillar too
// ──────────────────────────────────────────

function getRichLabel(score: number, pillars: PillarScore): string {
  const dominant = getDominant(pillars);
  const limiting = getLimiting(pillars);

  if (score >= 90) {
    return dominant === 'energia' ? 'Energia plena' : dominant === 'clareza' ? 'Foco máximo' : 'Equilíbrio elevado';
  }
  if (score >= 80) {
    return dominant === 'energia' ? 'Energia forte' : dominant === 'clareza' ? 'Foco sustentado' : 'Base sólida';
  }
  if (score >= 70) {
    return dominant === 'energia' ? 'Energia estável' : dominant === 'clareza' ? 'Clareza disponível' : 'Sustentação adequada';
  }
  if (score >= 60) {
    // Cross-reference: show what's limiting
    if (limiting === 'energia') return 'Energia contida';
    if (limiting === 'clareza') return 'Foco instável';
    return 'Oscilação presente';
  }
  if (score >= 50) {
    if (limiting === 'energia') return 'Energia reduzida';
    if (limiting === 'clareza') return 'Clareza parcial';
    return 'Sustentação frágil';
  }
  if (score >= 40) {
    if (limiting === 'energia') return 'Reserva baixa';
    if (limiting === 'clareza') return 'Dispersão detectada';
    return 'Instabilidade presente';
  }
  if (score >= 25) {
    return limiting === 'energia' ? 'Esgotamento energético' : limiting === 'clareza' ? 'Nevoeiro cognitivo' : 'Desregulação ativa';
  }
  return 'Recuperação necessária';
}

// ──────────────────────────────────────────
// "Hoje isso significa" — pillar-aware + phase-aware
// ──────────────────────────────────────────

function getTodayMeans(score: number, pillars: PillarScore, phase: string, limiting: string): string[] {
  const items: string[] = [];

  // Score-based primary message
  if (score >= 85) {
    items.push('Boa capacidade para trabalho profundo e contínuo.');
  } else if (score >= 70) {
    items.push('Funcional para blocos de foco de 1-2h com pausas entre eles.');
  } else if (score >= 55) {
    items.push('Capacidade limitada. Priorize as 2-3 tarefas mais importantes do dia.');
  } else if (score >= 40) {
    items.push('Dia para proteger a reserva. Faça apenas o essencial.');
  } else {
    items.push('Priorize recuperação — tarefas simples e automáticas apenas.');
  }

  // Pillar-specific secondary messages
  if (pillars.energia >= 4.0 && pillars.clareza >= 3.5) {
    items.push('Energia e clareza alinhadas — momento propício para decisões estratégicas.');
  } else if (pillars.energia >= 3.5 && pillars.estabilidade < 2.5) {
    items.push('Energia disponível mas estabilidade baixa — evite reuniões de conflito.');
  } else if (pillars.clareza >= 3.5 && pillars.energia < 2.5) {
    items.push('Clareza presente mas energia curta — use o foco em sessões breves.');
  } else if (pillars.estabilidade >= 4.0 && pillars.energia < 3.0) {
    items.push('Base estável com energia limitada — bom para tarefas que exigem paciência, não intensidade.');
  } else if (limiting === 'energia' && pillars.energia < 3.0) {
    items.push('Energia é o gargalo — evite sobrecarga e proteja o sono hoje.');
  } else if (limiting === 'clareza' && pillars.clareza < 3.0) {
    items.push('Clareza comprometida — use checklists e evite decisões complexas.');
  } else if (limiting === 'estabilidade' && pillars.estabilidade < 3.0) {
    items.push('Estabilidade oscilante — simplifique o ambiente e reduza estímulos.');
  } else {
    items.push('Intercale demandas com pausas para manter o rendimento ao longo do dia.');
  }

  // Phase-aware third message
  if (phase === 'BOOT') {
    if (score >= 70) items.push('Manhã favorável para o bloco de trabalho mais exigente.');
    else if (score >= 50) items.push('Comece devagar — a ativação pode melhorar o rendimento até o meio da manhã.');
    else items.push('Manhã para aclimatação — evite demandas intensas antes das 10h.');
  } else if (phase === 'HOLD') {
    if (score >= 70) items.push('Tarde com sustentação — mantenha o ritmo com intervalos regulares.');
    else if (score >= 50) items.push('Tarde requer gestão — priorize o que já está em andamento.');
    else items.push('Tarde para desacelerar — encerre o que puder e prepare a transição.');
  } else {
    if (score >= 60) items.push('Noite propícia para atividades de baixa demanda e reflexão.');
    else items.push('Noite para desconectar — o sistema precisa de espaço para se recalibrar.');
  }

  return items;
}

// ──────────────────────────────────────────
// System diagnosis — full contextual
// ──────────────────────────────────────────

function getSystemDiagnosis(score: number, pillars: PillarScore, limiting: string, phase: string): string {
  const limName = pillarNames[limiting]?.toLowerCase() || limiting;
  const spread = Math.max(pillars.energia, pillars.clareza, pillars.estabilidade) -
    Math.min(pillars.energia, pillars.clareza, pillars.estabilidade);

  let balance = '';
  if (spread < 0.6) balance = 'Pilares equilibrados.';
  else if (spread < 1.2) balance = `Leve assimetria — ${limName} merece atenção.`;
  else balance = `Desbalanceamento significativo — ${limName} está puxando o score para baixo.`;

  let recommendation = '';
  if (score >= 80) recommendation = 'Aproveite a janela para trabalho de alto valor.';
  else if (score >= 65) recommendation = 'Mantenha ritmo controlado com pausas regulares.';
  else if (score >= 50) recommendation = `Foque em estabilizar ${limName} antes de aumentar a carga.`;
  else if (score >= 35) recommendation = 'Reduza compromissos e priorize recuperação ativa.';
  else recommendation = 'Dia de proteção — o sistema precisa de repouso antes de retomar.';

  return `Score ${score}/100. ${balance} ${recommendation}`;
}

// ──────────────────────────────────────────
// Cognitive window — phase-adjusted
// ──────────────────────────────────────────

function getCognitiveWindow(score: number, pillars: PillarScore, phase: string): string {
  let hours = '';
  if (score >= 80 && pillars.clareza >= 4.0 && pillars.estabilidade >= 3.5) {
    hours = '3–4h de foco sustentado';
  } else if (score >= 70 && pillars.clareza >= 3.5 && pillars.estabilidade >= 3.0) {
    hours = '2–3h de foco com pausas';
  } else if (score >= 60 && pillars.clareza >= 3.0) {
    hours = '1–2h de foco em blocos curtos';
  } else if (score >= 50 && pillars.clareza >= 2.5) {
    hours = '30–60min de foco fragmentado';
  } else {
    return 'Janela cognitiva indisponível. Simplifique e adie tarefas exigentes.';
  }

  const phaseNote = phase === 'BOOT' ? 'Melhor aproveitamento pela manhã.'
    : phase === 'HOLD' ? 'Aproveite o início da tarde.' : 'Já em período de transição.';

  return `Janela cognitiva estimada: ${hours}. ${phaseNote}`;
}

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

function getDominant(pillars: PillarScore): string {
  if (pillars.energia >= pillars.clareza && pillars.energia >= pillars.estabilidade) return 'energia';
  if (pillars.clareza >= pillars.estabilidade) return 'clareza';
  return 'estabilidade';
}

function getLimiting(pillars: PillarScore): string {
  const min = Math.min(pillars.energia, pillars.clareza, pillars.estabilidade);
  if (pillars.energia === min) return 'energia';
  if (pillars.clareza === min) return 'clareza';
  return 'estabilidade';
}

// ──────────────────────────────────────────
// Main interpret function
// ──────────────────────────────────────────

export function interpret(state: VYRState): Interpretation {
  const { pillars, limitingFactor, phase, score } = state;

  // Context items — now phase-aware
  const contextItems: Interpretation['contextItems'] = [
    { text: getPillarContextText('Energia', pillars.energia, phase), status: getPillarStatus(pillars.energia) },
    { text: getPillarContextText('Clareza', pillars.clareza, phase), status: getPillarStatus(pillars.clareza) },
    { text: getPillarContextText('Estabilidade', pillars.estabilidade, phase), status: getPillarStatus(pillars.estabilidade) },
  ];

  // Cognitive window
  const cognitiveWindow = getCognitiveWindow(score, pillars, phase);

  // System reading
  const whyScore = getWhyScore(score, pillars, limitingFactor);
  const limitingFactorText = getLimitingFactorText(limitingFactor, pillars[limitingFactor as keyof PillarScore], phase);
  const dayRisk = getDayRisk(pillars, score);
  const systemReadingType = getSystemReadingType(score);
  const systemReading = `${whyScore} ${limitingFactorText} ${dayRisk}`;

  // Today means — pillar + phase aware
  const todayMeans = getTodayMeans(score, pillars, phase, limitingFactor);

  // Rich label
  const stateLabel = score === 0 ? 'Sem dados' : getRichLabel(score, pillars);

  // Pillar descriptions — cross-referencing other pillars
  const pillarDescriptions: Record<string, string> = {
    energia: generatePillarDescription('energia', pillars.energia, pillars),
    clareza: generatePillarDescription('clareza', pillars.clareza, pillars),
    estabilidade: generatePillarDescription('estabilidade', pillars.estabilidade, pillars),
  };

  // System diagnosis — contextual
  const systemDiagnosis = getSystemDiagnosis(score, pillars, limitingFactor, phase);

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
