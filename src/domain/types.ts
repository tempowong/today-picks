/** 水位帶只可按賽前已核對賠率 O 分類。即場價須標「即場」並附更新時間，不可套用本帶。 */
export type WaterBand =
  | "低水" // O < 1.82。1.82 與 1.83 都不是低水；1.83 亦不是中水。
  | "交界" // 1.82 <= O < 1.85，或 1.95 < O <= 2.00
  | "中水" // 1.85 <= O <= 1.95
  | "高水"; // O > 2.00

/** 淺盤只等於平／半。深盤只等於讓半／一、讓一球。平手、讓一／球半及更深屬其他；F2 不適用。即場盤深只作描述，不用作意圖。 */
export type HandicapDepth = "淺盤" | "深盤" | "其他";

/**
 * 測試本金 HK$2000。
 * 棄單固定 $0；通過並報告暫一律細注 $50。
 * 標準 $100、重注 $150 未有升級公式：不可寫進可渲染聯合型別，不可做可選檔位，不可畫升級控件。
 * 開波後不可新開即場注、不可加注、不可轉新盤。賽前細注在開波後只代表原決定追蹤。
 */
export type StakeTier = "棄單" | "細注";

/** 由簡報判斷。介面不可寫死隨信心或水位自動升注的規則。 */
export type Confidence = "低" | "中" | "高";

/**
 * 取／棄鎖定左欄 40。
 * 觀：同一印戳欄、同一 serif 700，用警示墨。只在沒有仍存活的取／棄可顯示時使用：
 * 開波後先見的即場觀察，以及無賽前決定的完場結算。不要第四種印戳。
 */
export type StampKind = "取" | "棄" | "觀";

/** F2／F3 只在 n >= 10 且使用賽前水位時綁定。n < 10（包括數據中心近 8 場）為不綁定。即場水位不可觸發或解除 F2／F3。 */
export type FilterBinding = "綁定" | "不綁定";

/** 不適用：未綁定，或並非賽前水位，或 F2 盤深不在讓半／一、讓一球。即場水位亦令 F2／F3 保持不適用或維持賽前已判定狀態，不可因即場價改寫。 */
export type FilterState = "未觸發" | "觸發" | "不適用";

export type Market = "HAD" | "HHA" | "HDC" | "HIL";

export type OddsSource = "bet.hkjc.com" | "football.hkjc.com";
// 來源頁：bet.hkjc.com 中文公開彩池；football.hkjc.com 賽事資料／投注工具。

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
      /** 介面必須印三個字元 ---，不可改成數字或裝飾線。即場暫停須同時寫「暫停」，等待並重新核對，不可虛構。 */
      display: "---";
      isPreMatch: boolean;
      label?: "即場";
      inPlayUpdatedAtHkt?: string;
      pausedCopy?: "暫停";
      source: OddsSource;
      verified: true;
    };

/** 只可填官方已刊出的比分、角球、紅黃牌、報告時段。未刊出的分鐘、牌或場地不可虛構。 */
export type OfficialPrintedEvents = {
  period?: string;
  score?: string;
  corners?: string;
  cards?: string;
};

export type Decision =
  | {
      kind: "取場";
      market: Market;
      selection: string;
      odds: Extract<VerifiedOdds, { status: "published"; isPreMatch: true }>;
      confidence: Confidence;
      stakeTier: "細注";
      stakeAmount: 50;
      reason: string;
    }
  | {
      kind: "棄單";
      code: "F2" | "F3" | "官方推介與水位衝突" | "其他";
      reason: string;
      stakeTier: "棄單";
      stakeAmount: 0;
    }
  | {
      kind: "F1改做HIL";
      market: "HIL";
      selection: string;
      odds: Extract<VerifiedOdds, { status: "published"; isPreMatch: true }>;
      confidence: Confidence;
      stakeTier: "細注";
      stakeAmount: 50;
      note: "棄讓球，改總入球";
      reason: string;
      /** 此變體只用於賽前。開波後 F1 改走即場 HIL 觀察，不是新細注。 */
    }
  | {
      kind: "開波後追蹤";
      stamp: "取";
      heroLabel: "更新心水";
      originalMarket: Market;
      originalSelection: string;
      originalSettled: false;
      inPlayOdds: VerifiedOdds; // 必須標「即場」並有 inPlayUpdatedAtHkt
      printed?: OfficialPrintedEvents;
      stakeTier: "細注";
      stakeAmount: 50;
      /** 原注不變。不加注，不轉新盤。 */
    }
  | {
      kind: "原選已結算觀察";
      stamp: "取";
      heroLabel: "即場觀察";
      originalSettled: true;
      reason: string;
      stakeTier: "細注";
      stakeAmount: 50;
      printed?: OfficialPrintedEvents;
      /** 注碼欄仍顯示原細注 $50 作為原決定追蹤。不可追新即場注。 */
    }
  | {
      kind: "賽前棄單即場更新";
      stamp: "棄";
      heroLabel: "即場觀察";
      stakeTier: "棄單";
      stakeAmount: 0;
      inPlayOdds?: VerifiedOdds;
      printed?: OfficialPrintedEvents;
      reason: string;
      /** 繼續五步並發布更新，但不可變成即場推介。 */
    }
  | {
      kind: "即場觀察";
      stamp: "觀";
      heroLabel: "即場觀察";
      firstSeenInPlay?: boolean; // 開波後先見，包括用家點名的 FB
      afterKickoffF1?: boolean; // 開波後 F1：即場 HIL 觀察，不是新細注
      stakeTier: "棄單";
      stakeAmount: 0;
      inPlayOdds?: VerifiedOdds;
      printed?: OfficialPrintedEvents;
      reason: string;
      /** 純文字狀態。不可渲染可點的落注或即場注控件，不可新開細注。 */
    }
  | {
      kind: "暫停受注";
      oddsDisplay: "---";
    }
  | {
      kind: "即場暫停";
      oddsDisplay: "---";
      pausedCopy: "暫停";
      inPlayUpdatedAtHkt: string;
      /** 等待並重新核對，不可虛構賠率。 */
    }
  | {
      kind: "完場結算觀察";
      stamp: StampKind; // 有賽前取／棄則沿用；開波後先見用 觀
      heroLabel: "完場結算觀察";
      stakeTier: StakeTier;
      stakeAmount: 0 | 50;
      printed?: OfficialPrintedEvents;
      reason: string;
      /** 只做結算觀察，不再分析即場盤口。 */
    };

export type OfficialPreview =
  | { kind: "none" }
  | { kind: "unverified"; quote: string } // 照引；不可當已核實正選／傷停
  | { kind: "verified"; quote: string };

export type FiveStepPath = {
  source: {
    pools: Market[]; // 先 HAD，有刊出再 HHA／HDC，再 HIL。即場同樣只可用已刊出的公開即場市場。電視標記不是市場。同頁其他 FB 編號不可混入本場。
    officialPreview: OfficialPreview;
    pages: Array<
      | "bet.hkjc.com 中文公開彩池"
      | "football.hkjc.com 賽事資料／投注工具"
    >;
  };
  water: {
    preMatchOdds: VerifiedOdds | null;
    band: WaterBand | null; // 僅由賽前 O 填寫。即場 VerifiedOdds 永不可帶 WaterBand。
    inPlayOdds?: VerifiedOdds; // 必須有 label「即場」與更新時間
  };
  depth: {
    line: string;
    depth: HandicapDepth;
    inverted: boolean; // 大名主隊在主場受讓，或客隊開出
    invertedShallowFollow: boolean; // 倒掛淺盤跟盤走
    inPlayDescriptiveOnly?: boolean; // 即場盤深只作描述，不用作意圖
  };
  record: {
    n: number | null; // null = 數據缺失，必須可見，禁止補至 10。不可因已開波而改寫或補場。
    wins: number | null;
    draws: number | null;
    wUpper: number | null; // 勝/n；覆蓋基準 >= 60% 才算達標
    uLower: number | null; // (勝+和)/n
    binding: FilterBinding;
    sameVenue: boolean;
    last8Explanation?: string; // 只可出現在第 4 步，且標明「近 8 場」。無場地名的數據中心近 8 不可併入具名場地。
    venueNote?: string; // 臨時或非常規場地不可併入該隊常規主場近 10。命名權／同址更名須官方確認同一場地才算同一場地。指定主場不是該隊所在國或常規主場。
  };
  intent: "正向控賠" | "誘下／籌碼分流" | "無";
  // 意圖只跟賽前水位。正向控賠：1.75 <= O < 1.82（賽前）。O < 1.75 仍屬低水，只是 F2 水位條件，禁止另立「上盤低水控賠」。
  // 誘下／籌碼分流：高水，或下盤有「打和即贏／輸一半」保護。即場價不可重算意圖。
};

export type HardFilters = {
  f1: FilterState; // 傷停與水位無關，開波後仍適用。賽前：棄讓球，改總入球（可仍為細注 $50）。開波後：即場 HIL 觀察，不是新細注。
  f2: FilterState; // 讓半／一或讓一球，且賽前 O_上 < 1.75（1.75 本身不觸發），且同場地勝率未達 >= 60% → 賽前棄單。即場水位不可觸發或解除。
  f3: FilterState; // 賽前 W_上 < 0.50 且 U_下 > 0.60（等於邊界本身不觸發）→ 賽前棄單，或只留即場觀察。即場水位不可觸發或解除。
};

export type ListFlag =
  | "即場追蹤"
  | "即場觀察"
  | "即場"
  | "完場"
  | "暫停 ---"
  | "數據缺失"
  | "未經核實"
  | "n<10 說明"
  | "中立場";

export type ListPhase = "進行中" | "未開" | "完場";

export type MatchListRow = {
  id: string;
  kickoffHkt: string; // 開賽（香港時間）
  phase: ListPhase; // 一覽排序：進行中（最急）在前，然後未開按開賽時間升序，完場置底
  home: string;
  away: string;
  awayMayBeNeutral?: boolean;
  decision: Decision;
  hero: string; // 最終心水、棄單原因、更新心水或即場觀察，同一欄，互斥
  stamp: StampKind;
  confidence?: Confidence;
  flags: ListFlag[];
  invalidation: string; // 詳情摺疊以上必見。開波後改寫為入球／紅牌／暫停受注／盤口撤銷／完場等。
  path: FiveStepPath;
  filters: HardFilters;
  verifiedAtHkt?: string; // 過期時核對時間必須可見
  inPlayUpdatedAtHkt?: string;
};
// 一覽範圍：只列被點名或賽前已報告的場，不可擴展到所有未被點名的進行中場次。
