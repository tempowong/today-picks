import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const market = v.union(v.literal("HAD"), v.literal("HHA"), v.literal("HDC"), v.literal("HIL"));
const oddsSource = v.union(v.literal("bet.hkjc.com"), v.literal("football.hkjc.com"));
const waterBand = v.union(v.literal("低水"), v.literal("交界"), v.literal("中水"), v.literal("高水"));
const handicapDepth = v.union(v.literal("淺盤"), v.literal("深盤"), v.literal("其他"));
const confidence = v.union(v.literal("低"), v.literal("中"), v.literal("高"));
const stampKind = v.union(v.literal("取"), v.literal("棄"), v.literal("觀"));
const filterBinding = v.union(v.literal("綁定"), v.literal("不綁定"));
const filterState = v.union(v.literal("未觸發"), v.literal("觸發"), v.literal("不適用"));
const listPhase = v.union(v.literal("進行中"), v.literal("未開"), v.literal("完場"));
const listFlag = v.union(
  v.literal("即場追蹤"),
  v.literal("即場觀察"),
  v.literal("即場"),
  v.literal("完場"),
  v.literal("暫停 ---"),
  v.literal("數據缺失"),
  v.literal("未經核實"),
  v.literal("n<10 說明"),
  v.literal("中立場"),
);

const verifiedOdds = v.union(
  v.object({
    status: v.literal("published"),
    value: v.number(),
    isPreMatch: v.literal(true),
    source: oddsSource,
    verified: v.literal(true),
  }),
  v.object({
    status: v.literal("published"),
    value: v.number(),
    isPreMatch: v.literal(false),
    label: v.literal("即場"),
    inPlayUpdatedAtHkt: v.string(),
    source: oddsSource,
    verified: v.literal(true),
  }),
  v.object({
    status: v.literal("suspended"),
    display: v.literal("---"),
    isPreMatch: v.boolean(),
    label: v.optional(v.literal("即場")),
    inPlayUpdatedAtHkt: v.optional(v.string()),
    pausedCopy: v.optional(v.literal("暫停")),
    source: oddsSource,
    verified: v.literal(true),
  }),
);

const printed = v.object({
  period: v.optional(v.string()),
  score: v.optional(v.string()),
  corners: v.optional(v.string()),
  cards: v.optional(v.string()),
});

const decision = v.union(
  v.object({
    kind: v.literal("取場"),
    market,
    selection: v.string(),
    odds: v.object({
      status: v.literal("published"),
      value: v.number(),
      isPreMatch: v.literal(true),
      source: oddsSource,
      verified: v.literal(true),
    }),
    confidence,
    stakeTier: v.literal("細注"),
    stakeAmount: v.literal(50),
    reason: v.string(),
  }),
  v.object({
    kind: v.literal("棄單"),
    code: v.union(
      v.literal("F2"),
      v.literal("F3"),
      v.literal("官方推介與水位衝突"),
      v.literal("其他"),
    ),
    reason: v.string(),
    stakeTier: v.literal("棄單"),
    stakeAmount: v.literal(0),
  }),
  v.object({
    kind: v.literal("F1改做HIL"),
    market: v.literal("HIL"),
    selection: v.string(),
    odds: v.object({
      status: v.literal("published"),
      value: v.number(),
      isPreMatch: v.literal(true),
      source: oddsSource,
      verified: v.literal(true),
    }),
    confidence,
    stakeTier: v.literal("細注"),
    stakeAmount: v.literal(50),
    note: v.literal("棄讓球，改總入球"),
    reason: v.string(),
  }),
  v.object({
    kind: v.literal("開波後追蹤"),
    stamp: v.literal("取"),
    heroLabel: v.literal("更新心水"),
    originalMarket: market,
    originalSelection: v.string(),
    originalSettled: v.literal(false),
    inPlayOdds: verifiedOdds,
    printed: v.optional(printed),
    stakeTier: v.literal("細注"),
    stakeAmount: v.literal(50),
  }),
  v.object({
    kind: v.literal("原選已結算觀察"),
    stamp: v.literal("取"),
    heroLabel: v.literal("即場觀察"),
    originalSettled: v.literal(true),
    reason: v.string(),
    stakeTier: v.literal("細注"),
    stakeAmount: v.literal(50),
    printed: v.optional(printed),
  }),
  v.object({
    kind: v.literal("賽前棄單即場更新"),
    stamp: v.literal("棄"),
    heroLabel: v.literal("即場觀察"),
    stakeTier: v.literal("棄單"),
    stakeAmount: v.literal(0),
    inPlayOdds: v.optional(verifiedOdds),
    printed: v.optional(printed),
    reason: v.string(),
  }),
  v.object({
    kind: v.literal("即場觀察"),
    stamp: v.literal("觀"),
    heroLabel: v.literal("即場觀察"),
    firstSeenInPlay: v.optional(v.boolean()),
    afterKickoffF1: v.optional(v.boolean()),
    stakeTier: v.literal("棄單"),
    stakeAmount: v.literal(0),
    inPlayOdds: v.optional(verifiedOdds),
    printed: v.optional(printed),
    reason: v.string(),
  }),
  v.object({
    kind: v.literal("暫停受注"),
    oddsDisplay: v.literal("---"),
  }),
  v.object({
    kind: v.literal("即場暫停"),
    oddsDisplay: v.literal("---"),
    pausedCopy: v.literal("暫停"),
    inPlayUpdatedAtHkt: v.string(),
  }),
  v.object({
    kind: v.literal("完場結算觀察"),
    stamp: stampKind,
    heroLabel: v.literal("完場結算觀察"),
    stakeTier: v.union(v.literal("棄單"), v.literal("細注")),
    stakeAmount: v.union(v.literal(0), v.literal(50)),
    printed: v.optional(printed),
    reason: v.string(),
  }),
);

const officialPreview = v.union(
  v.object({ kind: v.literal("none") }),
  v.object({ kind: v.literal("unverified"), quote: v.string() }),
  v.object({ kind: v.literal("verified"), quote: v.string() }),
);

const nullableNumber = v.union(v.number(), v.null());

const view = v.object({
  listMeta: v.string(),
  flagLine: v.optional(v.string()),
  deskFlag: v.optional(v.string()),
  deskHero: v.string(),
  deskOdds: v.string(),
  deskStake: v.string(),
  deskConf: v.string(),
  detailHero: v.string(),
  slotLabel: v.string(),
  detailExtra: v.optional(v.string()),
  oddsLine: v.string(),
  detailMeta: v.string(),
  printedLine: v.optional(v.string()),
  neutralNote: v.optional(v.string()),
  steps: v.array(
    v.object({
      n: v.string(),
      title: v.string(),
      body: v.string(),
    }),
  ),
  filtersLine: v.string(),
});

export default defineSchema({
  editions: defineTable({
    key: v.literal("demo"),
    label: v.literal("示範賽程"),
    dateLabel: v.string(),
    verifiedAtHkt: v.string(),
    disclaimer: v.string(),
  }).index("by_key", ["key"]),
  matches: defineTable({
    editionKey: v.literal("demo"),
    id: v.string(),
    kickoffHkt: v.string(),
    phase: listPhase,
    home: v.string(),
    away: v.string(),
    awayMayBeNeutral: v.optional(v.boolean()),
    decision,
    hero: v.string(),
    stamp: stampKind,
    confidence: v.optional(confidence),
    flags: v.array(listFlag),
    invalidation: v.string(),
    path: v.object({
      source: v.object({
        pools: v.array(market),
        officialPreview,
        pages: v.array(
          v.union(
            v.literal("bet.hkjc.com 中文公開彩池"),
            v.literal("football.hkjc.com 賽事資料／投注工具"),
          ),
        ),
      }),
      water: v.object({
        preMatchOdds: v.union(verifiedOdds, v.null()),
        band: v.union(waterBand, v.null()),
        inPlayOdds: v.optional(verifiedOdds),
      }),
      depth: v.object({
        line: v.string(),
        depth: handicapDepth,
        inverted: v.boolean(),
        invertedShallowFollow: v.boolean(),
        inPlayDescriptiveOnly: v.optional(v.boolean()),
      }),
      record: v.object({
        n: nullableNumber,
        wins: nullableNumber,
        draws: nullableNumber,
        wUpper: nullableNumber,
        uLower: nullableNumber,
        binding: filterBinding,
        sameVenue: v.boolean(),
        last8Explanation: v.optional(v.string()),
        venueNote: v.optional(v.string()),
      }),
      intent: v.union(v.literal("正向控賠"), v.literal("誘下／籌碼分流"), v.literal("無")),
    }),
    filters: v.object({
      f1: filterState,
      f2: filterState,
      f3: filterState,
    }),
    verifiedAtHkt: v.optional(v.string()),
    inPlayUpdatedAtHkt: v.optional(v.string()),
    view,
  }).index("by_edition", ["editionKey"]),
});
