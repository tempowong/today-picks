const PHASE_RANK = {
  進行中: 0,
  未開: 1,
  完場: 2,
} as const;

export function compareMatches<T extends { phase: keyof typeof PHASE_RANK; kickoffHkt: string }>(
  a: T,
  b: T,
): number {
  const byPhase = PHASE_RANK[a.phase] - PHASE_RANK[b.phase];
  if (byPhase !== 0) return byPhase;
  return a.kickoffHkt.localeCompare(b.kickoffHkt);
}
