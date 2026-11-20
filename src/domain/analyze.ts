import type {
  Decision,
  EditionWindow,
  FiveStepPath,
  HandicapDepth,
  HistoryRow,
  LineConfidence,
  ListFlag,
  Market,
  MatchListRow,
  VerifiedOdds,
} from "./types.ts";
import { EMPTY_CONFIDENCE, PENDING_CONFIDENCE } from "./types.ts";
import { expectedBinding, f2State, f3State, preMatchIntent, waterBand } from "./rules.ts";
import { depthOfNumbers, formatLine, negateLine, officialDepthName, parseCondition } from "./lines.ts";
import { settlePick } from "./settle.ts";

export type RawComb = {
  str?: string;
  status?: string;
  currentOdds?: string;
  selections?: { name_ch?: string; str?: string }[];
};
export type RawLine = { status?: string; condition?: string; main?: boolean; combinations?: RawComb[] };
export type RawPool = { oddsType?: string; status?: string; inplay?: boolean; updateAt?: string; lines?: RawLine[] };
export type RawMatch = {
  id: string;
  frontEndId?: string;
  status?: string;
  kickOffTime: string;
  homeTeam: { name_ch: string };
  awayTeam: { name_ch: string };
  tournament?: { name_ch?: string };
  venue?: { name_ch?: string } | null;
  runningResult?: { homeScore?: number | null; awayScore?: number | null; corner?: number | null } | null;
  foPools?: RawPool[];
};

const FULL = /RESULT|FULL|END|CLOSED|COMPLETE|AWARD/i;

export function isFullTime(status: string | undefined): boolean {
  return FULL.test(status ?? "");
}

export function isInPlay(status: string | undefined): boolean {
  return Boolean(status) && status !== "PREEVENT" && !isFullTime(status);
}

function kickClock(iso: string): string {
  const match = iso.match(/T(\d{2}:\d{2})/);
  return match?.[1] ?? iso;
}

function hktClock(iso: string | undefined): string | undefined {
  const match = iso?.match(/T(\d{2}:\d{2})/);
  return match?.[1];
}

function mainLine(pools: RawPool[], type: string): { pool: RawPool; line: RawLine } | null {
  const pool = pools.find((item) => item.oddsType === type);
  if (!pool) return null;
  const line = pool.lines?.find((item) => item.main) ?? pool.lines?.[0];
  if (!line) return null;
  return { pool, line };
}

function sideOdds(line: RawLine, side: string): number | null {
  const comb = line.combinations?.find((item) => item.str === side);
  if (!comb || comb.status === "SUSPENDED" || comb.currentOdds === "---" || comb.currentOdds == null) return null;
  const value = Number(comb.currentOdds);
  return Number.isFinite(value) ? value : null;
}

function suspended(pool: RawPool, line: RawLine): boolean {
  return (
    line.status === "SUSPENDED" ||
    (pool.status ?? "").includes("SUSPEND") ||
    line.combinations?.every((comb) => comb.currentOdds === "---" || comb.status === "SUSPENDED") === true
  );
}

const EMPTY = EMPTY_CONFIDENCE;

function basePath(input: {
  pools: Market[];
  odds: VerifiedOdds | null;
  band: FiveStepPath["water"]["band"];
  line: string;
  depth: HandicapDepth;
  inPlay: boolean;
  intent: FiveStepPath["intent"];
}): FiveStepPath {
  return {
    source: {
      pools: input.pools,
      officialPreview: { kind: "none" },
      homePage: "https://bet.hkjc.com/ch/football/home",
    },
    water: { preMatchOdds: input.inPlay ? null : input.odds, band: input.inPlay ? null : input.band },
    depth: {
      line: input.line,
      depth: input.depth,
      inverted: false,
      invertedShallowFollow: false,
      inPlayDescriptiveOnly: input.inPlay,
    },
    record: {
      n: null,
      wins: null,
      wUpper: null,
      uLower: null,
      binding: expectedBinding(null, !input.inPlay && input.odds?.status === "published"),
      sameVenue: false,
    },
    intent: input.inPlay ? "無" : input.intent,
  };
}

export function analyzeMatch(match: RawMatch, window: EditionWindow): { today?: MatchListRow; history?: HistoryRow } {
  const home = match.homeTeam.name_ch;
  const away = match.awayTeam.name_ch;
  const kick = kickClock(match.kickOffTime);
  const pools = match.foPools ?? [];
  const inPlay = isInPlay(match.status);
  const full = isFullTime(match.status);
  const score = match.runningResult;
  const printed =
    score && score.homeScore != null && score.awayScore != null ? `${score.homeScore}-${score.awayScore}` : null;

  if (inPlay || full) {
    const observed = observe(match, window, inPlay, full, printed);
    if (full) return { history: observed.history };
    return { today: observed.today };
  }

  const priced = price(pools);
  if (!priced) return {};
  if (priced.suspended) {
    const row = pauseRow(match, window, kick);
    return { today: row };
  }

  const binding = expectedBinding(null, true);
  const f2 = f2State({
    preMatchOdds: priced.upperOdds,
    preMatchPublished: true,
    binding,
    depth: priced.depth,
    wUpper: null,
    redirectedByF1: false,
  });
  const f3 = f3State({
    preMatchPublished: true,
    binding,
    wUpper: null,
    uLower: null,
    redirectedByF1: false,
  });
  const odds: VerifiedOdds = {
    status: "published",
    value: priced.odds,
    isPreMatch: true,
    source: "bet.hkjc.com",
    verified: true,
  };
  const band = waterBand(priced.odds);
  const intent = preMatchIntent(priced.odds, false);
  const path = basePath({
    pools: pools.map((pool) => pool.oddsType).filter((type): type is Market => type === "HAD" || type === "HHA" || type === "HDC" || type === "HIL"),
    odds,
    band,
    line: priced.readerLine,
    depth: priced.depth,
    inPlay: false,
    intent,
  });
  const filters = { f1: "未觸發" as const, f2, f3 };
  const flags: ListFlag[] = ["數據缺失"];
  if (priced.neutral) flags.push("中立場");

  const named = readerSelection(home, away, priced);
  const decision: Decision =
    f2 === "觸發"
      ? {
          kind: "棄單",
          code: "F2",
          reason: `上盤 ${priced.upperOdds.toFixed(2)}，同場地戰績缺失，F2 不追`,
          lineConfidence: EMPTY,
        }
      : {
          kind: "取場",
          pick: {
            market: priced.market,
            selection: named,
            odds,
            lineConfidence: PENDING_CONFIDENCE,
            publishedAtWindow: window,
          },
          reason: `${named}，賽前 ${priced.odds.toFixed(2)}，${band}。同場地戰績未刊於公開頁，F2／F3 不綁定。`,
        };

  const row: MatchListRow = {
    id: match.frontEndId || match.id,
    kickoffHkt: kick,
    phase: "未開",
    home,
    away,
    decision,
    hero:
      decision.kind === "取場"
        ? `${decision.pick.market}  ${decision.pick.selection}  ${decision.pick.odds.value.toFixed(2)}`
        : decision.reason,
    stamp: decision.kind === "取場" ? "取" : "棄",
    lineConfidence: decision.kind === "取場" ? PENDING_CONFIDENCE : EMPTY,
    publishedAtWindow: window,
    flags,
    invalidation:
      decision.kind === "棄單"
        ? "失效條件  本場賽前已棄單。開波後可繼續更新觀察，但不可變成即場推介。"
        : "失效條件  上盤賽前水位低於 1.75，且同場地勝率仍未達 60%，本場作廢。",
    path,
    filters,
  };
  return { today: row };
}

function observe(
  match: RawMatch,
  window: EditionWindow,
  inPlay: boolean,
  full: boolean,
  printed: string | null,
): { today?: MatchListRow; history?: HistoryRow } {
  const home = match.homeTeam.name_ch;
  const away = match.awayTeam.name_ch;
  const kick = kickClock(match.kickOffTime);
  const had = mainLine(match.foPools ?? [], "HAD");
  const homeOdds = had ? sideOdds(had.line, "H") : null;
  const updated = hktClock(had?.pool.updateAt);
  const history: HistoryRow = {
    id: match.frontEndId || match.id,
    kickoffHkt: kick,
    home,
    away,
    stamp: "觀",
    originalSelection: null,
    officialResult: printed ? { score: printed } : null,
    verdict: "不入帳",
    lineConfidence: EMPTY,
    decisionKind: "即場觀察",
  };
  if (full) return { history };
  const today: MatchListRow = {
    id: match.frontEndId || match.id,
    kickoffHkt: kick,
    phase: "進行中",
    home,
    away,
    decision: {
      kind: "即場觀察",
      stamp: "觀",
      heroLabel: "即場觀察",
      firstSeenInPlay: true,
      lineConfidence: EMPTY,
      reason: "開波後先見，不開新心水。",
    },
    hero: "即場觀察，不開新心水",
    stamp: "觀",
    lineConfidence: EMPTY,
    inPlayUpdatedAtHkt: updated,
    flags: ["即場觀察"],
    invalidation: "失效條件  入球、紅牌、暫停受注、盤口撤銷或完場，本觀察即失效，須重核。",
    path: basePath({
      pools: ["HAD"],
      odds: null,
      band: null,
      line: "即場盤口只作描述",
      depth: "其他",
      inPlay: true,
      intent: "無",
    }),
    filters: { f1: "未觸發", f2: "不適用", f3: "不適用" },
  };
  if (homeOdds != null && updated && today.path.water) {
    today.path.water.inPlayOdds = {
      status: "published",
      value: homeOdds,
      isPreMatch: false,
      label: "即場",
      inPlayUpdatedAtHkt: updated,
      source: "bet.hkjc.com",
      verified: true,
    };
  }
  void window;
  void inPlay;
  return { today };
}

function pauseRow(match: RawMatch, window: EditionWindow, kick: string): MatchListRow {
  return {
    id: match.frontEndId || match.id,
    kickoffHkt: kick,
    phase: "未開",
    home: match.homeTeam.name_ch,
    away: match.awayTeam.name_ch,
    decision: { kind: "暫停受注", oddsDisplay: "---" },
    hero: "暫停受注",
    stamp: "棄",
    lineConfidence: EMPTY,
    publishedAtWindow: window,
    flags: ["暫停 ---"],
    invalidation: "失效條件  暫停受注。須等待並重新核對，不可虛構賠率。",
    path: basePath({
      pools: ["HAD"],
      odds: { status: "suspended", display: "---", isPreMatch: true, source: "bet.hkjc.com", verified: true },
      band: null,
      line: "未刊出",
      depth: "其他",
      inPlay: false,
      intent: "無",
    }),
    filters: { f1: "未觸發", f2: "不適用", f3: "不適用" },
  };
}

type Priced = {
  market: "HAD" | "HHA" | "HDC" | "HIL";
  selection: string;
  readerLine: string;
  odds: number;
  upperOdds: number;
  depth: HandicapDepth;
  suspended: boolean;
  neutral: boolean;
};

function price(pools: RawPool[]): Priced | null {
  const hdc = mainLine(pools, "HDC");
  const hha = mainLine(pools, "HHA");
  const had = mainLine(pools, "HAD");
  const chosen = hdc ?? hha ?? had;
  if (!chosen) return null;
  const market = (chosen.pool.oddsType ?? "HAD") as Priced["market"];
  if (suspended(chosen.pool, chosen.line)) {
    return {
      market,
      selection: "暫停受注",
      readerLine: "---",
      odds: 0,
      upperOdds: 0,
      depth: "其他",
      suspended: true,
      neutral: false,
    };
  }
  const home = sideOdds(chosen.line, "H");
  const away = sideOdds(chosen.line, "A");
  if (home == null || away == null) {
    return {
      market,
      selection: "暫停受注",
      readerLine: "---",
      odds: 0,
      upperOdds: 0,
      depth: "其他",
      suspended: true,
      neutral: false,
    };
  }
  const parts = parseCondition(chosen.line.condition ?? "0");
  const depth = market === "HAD" ? "其他" : depthOfNumbers(parts);
  const pickHome = home <= away;
  const signed = pickHome ? parts : negateLine(parts);
  const teamLine = market === "HAD" ? "" : formatLine(signed);
  return {
    market,
    selection: teamLine ? `${pickHome ? "主" : "客"} ${teamLine}` : pickHome ? "主隊勝" : "客隊勝",
    readerLine: teamLine || "HAD",
    odds: pickHome ? home : away,
    upperOdds: Math.min(home, away),
    depth,
    suspended: false,
    neutral: false,
  };
}

export function readerSelection(home: string, away: string, priced: { selection: string }): string {
  if (priced.selection.startsWith("主 ")) return `${home} ${priced.selection.slice(2)}`;
  if (priced.selection.startsWith("客 ")) return `${away} ${priced.selection.slice(2)}`;
  if (priced.selection === "主隊勝") return home;
  if (priced.selection === "客隊勝") return away;
  return priced.selection;
}

export function officialTerm(depth: HandicapDepth, condition: string): string {
  return officialDepthName(depth, parseCondition(condition));
}

export function confidenceLabel(confidence: LineConfidence): string {
  if (confidence.kind === "不適用") return "-";
  if (confidence.kind === "待公式") return "待公式";
  if (confidence.kind === "示範佔位") return `${confidence.percent}%（示範佔位）`;
  return `${confidence.percent}%`;
}

export { settlePick };
