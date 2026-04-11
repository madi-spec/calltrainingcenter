export function formatNumber(n) {
  if (n === null || n === undefined) return '\u2014';
  return new Intl.NumberFormat('en-US').format(n);
}

export function formatPercent(n, decimals = 0) {
  if (n === null || n === undefined) return '\u2014';
  return `${n.toFixed(decimals)}%`;
}

export function formatDuration(minutes) {
  if (!minutes) return '\u2014';
  if (minutes < 1) return '<1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatScore(score) {
  if (score === null || score === undefined) return '\u2014';
  return Math.round(score).toString();
}
