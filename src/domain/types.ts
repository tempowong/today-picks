/** Water bands from pre-match verified O only. In-play prices must be labeled 即場 and never take a WaterBand. */
export type WaterBand =
  | "低水" // O < 1.82. 1.82 and 1.83 are not 低水; 1.83 is not 中水.
  | "交界" // 1.82 <= O < 1.85, or 1.95 < O <= 2.00
  | "中水" // 1.85 <= O <= 1.95
  | "高水"; // O > 2.00

/** 淺盤 = 平／半 only. 深盤 = 讓半／一 or 讓一球. In-play depth is descriptive only. */
export type HandicapDepth = "淺盤" | "深盤" | "其他";

/** 盤口信心. No official formula yet. Only on published 取場 tips. 棄單 / 即場觀察 / 觀 must be 不適用. */
export type LineConfidence =
  | { kind: "待公式"; percent: null }
  | { kind: "不適用"; percent: null }
  | { kind: "示範佔位"; percent: number; demo: true }
  | { kind: "已公布"; percent: number };

export type EditionWindow = "07:00" | "10:00" | "13:00" | "16:00" | "19:00" | "22:00";

/** Each edition comes from a scheduled fetch of both public HKJC pages, then SOP analysis. In-play updates are not a new edition. */
export type EditionJob = {
  window: EditionWindow;
  status: "等待" | "提取中" | "分析中" | "已刊出" | "提取失敗";
  fetchedAtHkt: string | null;
  /** A job must read both public sources, not only one. */
  sources: ["bet.hkjc.com", "football.hkjc.com"];
};

export type StampKind = "取" | "棄" | "觀";
export type FilterBinding = "綁定" | "不綁定";
export type FilterState = "未觸發" | "觸發" | "不適用";
export type Market = "HAD" | "HHA" | "HDC" | "HIL";
export type ListPhase = "進行中" | "未開";
export type SettlementVerdict = "贏" | "輸" | "不入帳" | "待結算";
export type ListFlag =
  | "即場追蹤"
  | "即場觀察"
  | "即場"
  | "暫停 ---"
  | "數據缺失"
  | "未經核實"
  | "n<10 說明"
  | "中立場";

export type OddsSource = "bet.hkjc.com" | "football.hkjc.com";

export type VerifiedOdds =
  | {
      status: "published";
      value: number;
      isPreMatch: true;
      source: OddsSource;
      verified: true;
    }
  | {
      status: "published";
      value: number;
      isPreMatch: false;
      label: "即場";
      inPlayUpdatedAtHkt: string;
      source: OddsSource;
      verified: true;
    }
  | {
      status: "suspended";
      display: "---";
      isPreMatch: boolean;
      label?: "即場";
      inPlayUpdatedAtHkt?: string;
      pausedCopy?: "暫停";
      source: OddsSource;
      verified: true;
    };

export type PublishedPick = {
  market: Market;
  /** Reader-facing line uses +/- from the selected team (受讓 +, 開出 -), e.g. 藍山 +0.5/+1. */
  selection: string;
  odds: Extract<VerifiedOdds, { status: "published"; isPreMatch: true }>;
  lineConfidence: LineConfidence;
  publishedAtWindow: EditionWindow;
};

export type Decision =
  | { kind: "取場"; pick: PublishedPick; reason: string }
  | {
      kind: "棄單";
      code: "F2" | "F3" | "官方推介與水位衝突" | "其他";
      reason: string;
      lineConfidence: { kind: "不適用"; percent: null };
    }
  | { kind: "F1改做HIL"; pick: PublishedPick; note: "棄讓球，改總入球"; reason: string }
  | {
      kind: "開波後追蹤";
      stamp: "取";
      heroLabel: "更新心水";
      original: PublishedPick;
      originalSettled: false;
      inPlayOdds: VerifiedOdds;
    }
  | {
      kind: "原選已結算觀察";
      stamp: "取";
      heroLabel: "即場觀察";
      original: PublishedPick;
      originalSettled: true;
      reason: string;
    }
  | {
      kind: "賽前棄單即場更新";
      stamp: "棄";
      heroLabel: "即場觀察";
      lineConfidence: { kind: "不適用"; percent: null };
      reason: string;
    }
  | {
      kind: "即場觀察";
      stamp: "觀";
      heroLabel: "即場觀察";
      firstSeenInPlay?: boolean;
      afterKickoffF1?: boolean;
      lineConfidence: { kind: "不適用"; percent: null };
      reason: string;
    }
  | { kind: "暫停受注"; oddsDisplay: "---" }
  | { kind: "即場暫停"; oddsDisplay: "---"; pausedCopy: "暫停"; inPlayUpdatedAtHkt: string };

export type FiveStepPath = {
  source: {
    pools: Market[];
    officialPreview: { kind: "none" } | { kind: "unverified" | "verified"; quote: string };
    homePage: "https://bet.hkjc.com/ch/football/home";
  };
  water: { preMatchOdds: VerifiedOdds | null; band: WaterBand | null; inPlayOdds?: VerifiedOdds };
  depth: {
    line: string;
    depth: HandicapDepth;
    inverted: boolean;
    invertedShallowFollow: boolean;
    inPlayDescriptiveOnly?: boolean;
  };
  record: {
    n: number | null;
    wins: number | null;
    wUpper: number | null;
    uLower: number | null;
    binding: FilterBinding;
    sameVenue: boolean;
  };
  intent: "正向控賠" | "誘下／籌碼分流" | "無";
};

export type HardFilters = {
  f1: FilterState;
  f2: FilterState;
  f3: FilterState;
};

export type MatchListRow = {
  id: string;
  kickoffHkt: string;
  phase: ListPhase;
  home: string;
  away: string;
  decision: Decision;
  hero: string;
  stamp: StampKind;
  lineConfidence: LineConfidence;
  publishedAtWindow?: EditionWindow;
  inPlayUpdatedAtHkt?: string;
  /** Official printed score only. Absent until the public page prints one. */
  officialScore?: string;
  flags: ListFlag[];
  invalidation: string;
  path: FiveStepPath;
  filters: HardFilters;
};

export type HistoryRow = {
  id: string;
  kickoffHkt: string;
  home: string;
  away: string;
  stamp: StampKind;
  originalSelection: { market?: Market; selection: string } | null;
  officialResult: { score: string } | null;
  verdict: SettlementVerdict;
  lineConfidence: LineConfidence;
  publishedAtWindow?: EditionWindow;
  decisionKind: Decision["kind"];
};

export const EDITION_WINDOWS = ["07:00", "10:00", "13:00", "16:00", "19:00", "22:00"] as const;

export const PENDING_CONFIDENCE = { kind: "待公式", percent: null } as const;
export const EMPTY_CONFIDENCE = { kind: "不適用", percent: null } as const;
