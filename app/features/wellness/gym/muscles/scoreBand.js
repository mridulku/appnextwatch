export function getScoreBand(scoreValue) {
  const score = Number(scoreValue) || 0;
  if (score >= 80) return 'Primary';
  if (score >= 60) return 'Secondary';
  if (score >= 40) return 'Assist';
  return 'Low';
}

export function formatScore(scoreValue) {
  const score = Math.max(0, Math.min(100, Math.round(Number(scoreValue) || 0)));
  return `${score}/100`;
}
