import type { MatchListRow, StampKind } from "./types.ts";

export function matchName(home: string, away: string, density: "card" | "row"): string {
  return density === "row" ? `${home} vs ${away}` : `${home}  vs  ${away}`;
}

export function kickLine(row: Pick<MatchListRow, "kickoffHkt" | "phase" | "decision">): string {
  const base = `開賽 ${row.kickoffHkt}  香港時間`;
  if (row.phase === "完場") return `${base}  ·  完場`;
  if (row.phase !== "進行中") return base;
  if (row.decision.kind === "即場觀察" && row.decision.firstSeenInPlay) {
    return `${base}  ·  進行中（開波後先見）`;
  }
  return `${base}  ·  進行中`;
}

export function countStamps(rows: readonly { stamp: StampKind }[]): {
  take: number;
  drop: number;
  observe: number;
} {
  return {
    take: rows.filter((row) => row.stamp === "取").length,
    drop: rows.filter((row) => row.stamp === "棄").length,
    observe: rows.filter((row) => row.stamp === "觀").length,
  };
}

export function countLine(
  counts: { take: number; drop: number; observe: number },
  verifiedAtHkt: string,
  stale: boolean,
): string {
  const time = stale ? `${verifiedAtHkt}（香港時間）` : verifiedAtHkt;
  return `取 ${counts.take} · 棄 ${counts.drop} · 觀察 ${counts.observe} · 核對時間 ${time}`;
}

/** Prefer the in-play track so the desktop pane is not empty and does not skip a kicked-off match. */
export function defaultMatchId(rows: readonly { id: string; decision: { kind: string } }[]): string | null {
  return rows.find((row) => row.decision.kind === "開波後追蹤")?.id ?? rows[0]?.id ?? null;
}
