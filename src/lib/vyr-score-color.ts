/** Returns the CSS variable name for the score range color */
export function getScoreColorVar(score: number): string {
  if (score >= 85) return '--vyr-score-otimo';
  if (score >= 70) return '--vyr-score-bom';
  if (score >= 55) return '--vyr-score-moderado';
  if (score >= 40) return '--vyr-score-baixo';
  return '--vyr-score-critico';
}

/** Returns the hsl() string for the score range */
export function getScoreColor(score: number): string {
  return `hsl(var(${getScoreColorVar(score)}))`;
}
