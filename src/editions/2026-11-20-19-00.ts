import type { EditionWindow } from "../domain/types.ts";
import type { Nomination } from "../domain/edition.ts";

/**
 * Ingest path for Ray's 定時推薦.
 * A window publishes this list only. The fetch still reads both public pages
 * and checks names, the handicap, and official full-time scores. It does not
 * turn the rest of the coupon into 取. A later window with no file keeps the
 * previous edition. Add a file for that window; do not auto-fill one.
 */
export const EDITION_19_DATE = "2026-11-20";
export const EDITION_19_WINDOW: EditionWindow = "19:00";

const sharedSource = "只讀 bet.hkjc.com/ch/football/home 與 football.hkjc.com。場地未印於公開彩池。";

export const EDITION_19: Nomination[] = [
  {
    frontEndId: "FB9198",
    home: "吉達艾阿里",
    away: "艾納斯",
    kickoffHkt: "21/11 01:30",
    phaseAtPublish: "未開",
    stamp: "取",
    hero: "HDC  艾納斯 0/-0.5  1.74",
    selection: "艾納斯 0/-0.5",
    odds: 1.74,
    market: "HDC",
    depth: "淺盤",
    line: "0/-0.5",
    inverted: true,
    band: "低水",
    upperOdds: 1.74,
    n: 8,
    invalidation: "失效條件  主隊迫出和局或小勝（平／半和局輸一半）；開賽前盤口或水位再變。",
    stepNotes: [
      `${sharedSource}非五大聯賽。`,
      "上盤 1.74 低水，下盤 2.05 高水。HAD 客勝 1.84 是交界，以讓球為主。即場價不另分類。",
      "倒掛淺盤，客讓平／半。讀者盤口 艾納斯 0/-0.5。平／半不是 F2 適用盤深，1.74 低於 1.75 亦不觸發 F2。",
      "同場地 n 為 8，不補至 10，場地未具名，所以 F2、F3 不適用、不綁定。艾納斯同客 5 勝 1 和 2 負，勝率 63%；吉達艾阿里同主 7 勝 1 和 0 負，不敗率 100%。",
      "意圖：無。1.74 低於 1.75，不是正向控賠。只跟賽前。",
    ],
    filters: { f1: "未觸發", f2: "不適用", f3: "不適用" },
    settleAs: "取",
  },
  {
    frontEndId: "FB9270",
    home: "大阪櫻花",
    away: "FC東京",
    kickoffHkt: "21/11 14:00",
    phaseAtPublish: "未開",
    stamp: "取",
    hero: "HDC  FC東京 -0.5/-1  1.74",
    selection: "FC東京 -0.5/-1",
    odds: 1.74,
    market: "HDC",
    depth: "深盤",
    line: "-0.5/-1",
    inverted: true,
    band: "低水",
    upperOdds: 1.74,
    n: 8,
    invalidation: "失效條件  大阪櫻花迫出一球小勝或和局（半／一會輸一半或全輸）；客隊後衛最終缺陣令後防明顯削弱；開賽前盤口或水位再變。",
    stepNotes: [
      `${sharedSource}日本職業聯賽。`,
      "上盤 1.74 低水。HAD 客勝 1.49 偏薄，心水留在讓球。即場價不另分類。",
      "倒掛深盤，客讓半／一。讀者盤口 FC東京 -0.5/-1。盤深是讓半／一，而且上盤低於 1.75，但 n 只有 8，F2 不綁定，不作廢。",
      "同場地 n 為 8，不補至 10。F1 未觸發。F3 即使可計也不觸發，上盤勝率不是低於 50%。",
      "意圖：無。只跟賽前。",
    ],
    filters: { f1: "未觸發", f2: "不適用", f3: "不適用" },
    settleAs: "取",
  },
  {
    frontEndId: "FB9166",
    home: "鹿島鹿角",
    away: "清水心跳",
    kickoffHkt: "18:00",
    phaseAtPublish: "進行中",
    stamp: "觀",
    hero: "即場觀察，不開新心水",
    selection: "鹿島鹿角 讓一球",
    odds: 1.75,
    market: "HDC",
    depth: "深盤",
    line: "讓一球",
    inverted: false,
    band: null,
    upperOdds: 1.75,
    n: null,
    invalidation: "失效條件  不改注、不追新即場注。讓球暫停只印「暫停」。完場後本觀察不入帳。",
    stepNotes: [
      `${sharedSource}日本職業聯賽。FB9166。`,
      "賽前讓一球 1.75 只作參照。即場讓球暫停，不把即場價分成水位帶，也不用來觸發或解除 F2、F3。",
      "賽前盤深是讓一球。即場盤口只印暫停，不另開新心水。",
      "這場不是已刊出的取。戰績不另造。",
      "意圖：無。只跟賽前。",
    ],
    filters: { f1: "未觸發", f2: "不適用", f3: "不適用" },
    settleAs: "不入帳",
    historyNote: "半場 0-0，全場以公開賽果為準。賽前讓一球 1.75 只作觀察，不入帳。",
  },
];

export function nominationsFor(date: string, window: EditionWindow): Nomination[] | null {
  if (date === EDITION_19_DATE && window === EDITION_19_WINDOW) return EDITION_19;
  return null;
}
