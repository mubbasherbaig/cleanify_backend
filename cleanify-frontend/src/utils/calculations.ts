export function percentage(part: number, total: number): number {
  return total === 0 ? 0 : (part / total) * 100;
}

export function round(value: number, precision: number = 2): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}