import type { EditionWindow, HandicapDepth, HistoryRow, ListPhase, MatchListRow } from "./types.ts";

/** Printed only when F2 actually voids a pre-match take. Never a default on every 取 card. */
export const F2_VOID_SENTENCE = "上盤賽前水位低於 1.75，且同場地勝率仍未達 60%，本場作廢";

/**
 * F2 is 讓半／一 or 讓一球 only, pre-match, O_上 < 1.75, and n >= 10.
 * 平／半, deeper than 讓一球, n < 10, or O_上 >= 1.75 do not use the void sentence.
 */
export function f2VoidApplies(input: {
  depthName: "平／半" | "讓半／一" | "讓一球" | "其他";
  upperOdds: number | null;
  n: number | null;
  preMatch: boolean;
}): boolean {
  if (!input.preMatch || input.upperOdds == null || input.n == null || input.n < 10) return false;
  if (input.depthName !== "讓半／一" && input.depthName !== "讓一球") return false;
  return input.upperOdds < 1.75;
}

export function filterToday<T extends { phase: ListPhase }>(rows: T[], phase: "全部" | ListPhase): T[] {
  const sorted = [...rows].sort((a, b) => {
    if (a.phase !== b.phase) return a.phase === "進行中" ? -1 : 1;
    return 0;
  });
  if (phase === "全部") return sorted;
  return sorted.filter((row) => row.phase === phase);
}

/** The rail wait line follows the next window, never the window already on the masthead. */
export function editionWaitLine(nextWindow: EditionWindow | null): string | null {
  if (!nextWindow) return null;
  return `等待 ${nextWindow} 定時提取並刊出`;
}

export type ScoreRow = {
  homeResult: number;
  awayResult: number;
  resultConfirmType: number;
  payoutConfirmed: boolean;
  stageId: number;
  resultType: number;
  sequence: number;
};

/** The public results page: stage 3 is 半場, stage 5 is 全場. A live score is not this. */
export function officialPrintedScore(results: ScoreRow[] | null | undefined, stageId: 3 | 5): string | null {
  const row = (results ?? [])
    .filter(
      (item) =>
        item.resultType === 1 &&
        item.resultConfirmType > 1 &&
        item.stageId === stageId &&
        item.payoutConfirmed &&
        item.homeResult >= 0 &&
        item.awayResult >= 0,
    )
    .sort((a, b) => b.sequence - a.sequence)[0];
  if (!row) return null;
  return `${row.homeResult}-${row.awayResult}`;
}

export type PoolCheck = {
  frontEndId: string;
  home: string;
  away: string;
  status?: string;
  hdc?: { condition: string; homeOdds: number | null; awayOdds: number | null; suspended: boolean };
};

/**
 * A nomination is one match Ray already published for a window.
 * The file for that window is the whole 定時推薦. It is not a coupon.
 */
export type Nomination = {
  frontEndId: string;
  home: string;
  away: string;
  kickoffHkt: string;
  phaseAtPublish: ListPhase;
  stamp: "取" | "觀";
  hero: string;
  selection: string | null;
  odds: number | null;
  market: "HDC" | null;
  depth: HandicapDepth;
  line: string;
  inverted: boolean;
  band: "低水" | "交界" | "中水" | "高水" | null;
  upperOdds: number | null;
  n: number | null;
  invalidation: string;
  stepNotes: [string, string, string, string, string];
  filters: MatchListRow["filters"];
  /** 即場觀察 is never settled 贏／輸, even after an official full-time score. */
  settleAs: "取" | "不入帳";
  historyNote?: string;
};

export type EditionDraft = {
  /** No nomination and nothing already published: caller keeps the previous edition. */
  held: boolean;
  today: MatchListRow[];
  history: HistoryRow[];
};

function odds(value: number, preMatch: boolean): MatchListRow["path"]["water"]["preMatchOdds"] {
  if (!preMatch) return null;
  return { status: "published", value, isPreMatch: true, source: "bet.hkjc.com", verified: true };
}

function rowFrom(nomination: Nomination, window: EditionWindow, check: PoolCheck | undefined): MatchListRow {
  const verified = check != null && check.home === nomination.home && check.away === nomination.away;
  const suspended = check?.hdc?.suspended === true;
  const inPlay = nomination.phaseAtPublish === "進行中";
  const flags: MatchListRow["flags"] = [];
  if (!verified) flags.push("未經核實");
  if (nomination.n != null && nomination.n < 10) flags.push("n<10 說明");
  if (inPlay) flags.push(nomination.stamp === "觀" ? "即場觀察" : "即場追蹤");
  if (suspended) flags.push("暫停 ---");
  const decision: MatchListRow["decision"] =
    nomination.stamp === "觀"
      ? {
          kind: "即場觀察",
          stamp: "觀",
          heroLabel: "即場觀察",
          firstSeenInPlay: false,
          lineConfidence: { kind: "不適用", percent: null },
          reason: nomination.hero,
        }
      : {
          kind: "取場",
          reason: nomination.hero,
          pick: {
            market: nomination.market ?? "HDC",
            selection: nomination.selection ?? nomination.hero,
            odds: {
              status: "published",
              value: nomination.odds ?? 0,
              isPreMatch: true,
              source: "bet.hkjc.com",
              verified: true,
            },
            lineConfidence: { kind: "待公式", percent: null },
            publishedAtWindow: window,
          },
        };
  return {
    id: nomination.frontEndId,
    kickoffHkt: nomination.kickoffHkt,
    phase: nomination.phaseAtPublish,
    home: nomination.home,
    away: nomination.away,
    decision,
    hero: nomination.hero,
    stamp: nomination.stamp,
    lineConfidence: nomination.stamp === "取" ? { kind: "待公式", percent: null } : { kind: "不適用", percent: null },
    publishedAtWindow: window,
    flags,
    invalidation: nomination.invalidation,
    stepNotes: nomination.stepNotes,
    filters: nomination.filters,
    path: {
      source: {
        pools: ["HAD", "HHA", "HDC", "HIL"],
        officialPreview: { kind: "none" },
        homePage: "https://bet.hkjc.com/ch/football/home",
      },
      water: {
        preMatchOdds: nomination.odds != null ? odds(nomination.odds, true) : null,
        band: inPlay ? null : nomination.band,
        ...(suspended
          ? {
              inPlayOdds: {
                status: "suspended" as const,
                display: "---" as const,
                isPreMatch: false as const,
                label: "即場" as const,
                pausedCopy: "暫停" as const,
                source: "bet.hkjc.com" as const,
                verified: true as const,
              },
            }
          : {}),
      },
      depth: {
        line: nomination.line,
        depth: nomination.depth,
        inverted: nomination.inverted,
        invertedShallowFollow: false,
        inPlayDescriptiveOnly: inPlay,
      },
      record: {
        n: nomination.n,
        wins: null,
        wUpper: null,
        uLower: null,
        binding: nomination.n != null && nomination.n >= 10 ? "綁定" : "不綁定",
        sameVenue: false,
      },
      intent: "無",
    },
  };
}

function historyFrom(nomination: Nomination, window: EditionWindow, fullTime: string): HistoryRow {
  return {
    id: nomination.frontEndId,
    kickoffHkt: nomination.kickoffHkt,
    home: nomination.home,
    away: nomination.away,
    stamp: nomination.stamp,
    originalSelection:
      nomination.settleAs === "取" && nomination.selection
        ? { market: nomination.market ?? "HDC", selection: nomination.selection }
        : null,
    officialResult: { score: fullTime },
    verdict: nomination.settleAs === "取" ? "待結算" : "不入帳",
    lineConfidence: nomination.stamp === "取" ? { kind: "待公式", percent: null } : { kind: "不適用", percent: null },
    publishedAtWindow: window,
    decisionKind: nomination.stamp === "觀" ? "即場觀察" : "取場",
    note: nomination.historyNote,
  };
}

/**
 * Publish only nominated matches. An official match that is not on the list
 * never becomes a 取, even when it has a line and F2/F3 are 不適用.
 * An official full-time score moves the nominated row off 今日.
 * 即場觀察 goes to 往績 as 不入帳, never 贏 or 輸.
 */
export function composeEdition(input: {
  window: EditionWindow;
  nominations: Nomination[] | null;
  checks: PoolCheck[];
  fullTimeById?: Record<string, string | null>;
}): EditionDraft {
  if (!input.nominations || input.nominations.length === 0) {
    return { held: true, today: [], history: [] };
  }
  const today: MatchListRow[] = [];
  const history: HistoryRow[] = [];
  for (const nomination of input.nominations) {
    const check = input.checks.find((item) => item.frontEndId === nomination.frontEndId);
    const fullTime = input.fullTimeById?.[nomination.frontEndId] ?? null;
    if (fullTime) {
      history.push(historyFrom(nomination, input.window, fullTime));
      continue;
    }
    today.push(rowFrom(nomination, input.window, check));
  }
  today.sort((a, b) => (a.phase === b.phase ? a.kickoffHkt.localeCompare(b.kickoffHkt) : a.phase === "進行中" ? -1 : 1));
  return { held: false, today, history };
}
