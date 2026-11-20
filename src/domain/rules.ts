import type { FilterBinding, FilterState, HandicapDepth, WaterBand } from "./types.ts";

/** Round a ratio the way the board prints W_上 and U_下 (two decimal places). */
export function roundRatio(part: number, whole: number): number {
  return Math.round((part / whole) * 100) / 100;
}

/** Prematch water band. 1.82 and 1.83 are 交界; 1.83 is not 中水. */
export function waterBand(odds: number): WaterBand {
  if (odds < 1.82) return "低水";
  if (odds < 1.85) return "交界";
  if (odds <= 1.95) return "中水";
  if (odds <= 2) return "交界";
  return "高水";
}

export function depthOfPrematchLine(
  line: "平手" | "平／半" | "讓半／一" | "讓一球" | "讓一／球半",
): HandicapDepth {
  switch (line) {
    case "平手":
    case "讓一／球半":
      return "其他";
    case "平／半":
      return "淺盤";
    case "讓半／一":
    case "讓一球":
      return "深盤";
  }
}

/** F2/F3 bind only when n >= 10 and the price is a published prematch odds. */
export function expectedBinding(n: number | null, preMatchPublished: boolean): FilterBinding {
  if (!preMatchPublished || n == null || n < 10) return "不綁定";
  return "綁定";
}

export function f2State(input: {
  preMatchOdds: number | null;
  preMatchPublished: boolean;
  binding: FilterBinding;
  depth: HandicapDepth;
  wUpper: number | null;
  redirectedByF1: boolean;
}): FilterState {
  if (input.redirectedByF1) return "不適用";
  if (!input.preMatchPublished || input.preMatchOdds == null) return "不適用";
  if (input.binding !== "綁定" || input.depth !== "深盤" || input.wUpper == null) return "不適用";
  if (input.preMatchOdds < 1.75 && input.wUpper < 0.6) return "觸發";
  return "未觸發";
}

export function f3State(input: {
  preMatchPublished: boolean;
  binding: FilterBinding;
  wUpper: number | null;
  uLower: number | null;
  redirectedByF1: boolean;
}): FilterState {
  if (input.redirectedByF1) return "不適用";
  if (!input.preMatchPublished || input.binding !== "綁定") return "不適用";
  if (input.wUpper == null || input.uLower == null) return "不適用";
  if (input.wUpper < 0.5 && input.uLower > 0.6) return "觸發";
  return "未觸發";
}

/**
 * Intent follows prematch odds only.
 * 正向控賠 is 1.75 <= O < 1.82. O < 1.75 stays 低水 and is not its own intent.
 * A lower-side 打和即贏／輸一半 mark is 誘下 even inside that band.
 */
export function preMatchIntent(
  odds: number | null,
  lowerProtected: boolean,
): "正向控賠" | "誘下／籌碼分流" | "無" {
  if (lowerProtected) return "誘下／籌碼分流";
  if (odds == null) return "無";
  if (odds >= 1.75 && odds < 1.82) return "正向控賠";
  if (odds > 2) return "誘下／籌碼分流";
  return "無";
}
