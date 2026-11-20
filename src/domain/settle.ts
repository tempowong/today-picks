import type { Market, SettlementVerdict } from "./types.ts";
import { parseCondition } from "./lines.ts";

/**
 * Asian line from the selected team's point of view.
 * A split line is one stake on each half. Net > 0 is 贏, net < 0 is 輸, a push is 不入帳.
 * There is no 贏半 grade.
 */
export function settleLine(scoreFor: number, scoreAgainst: number, line: string): SettlementVerdict {
  const parts = parseCondition(line.replace(/^\+/, ""));
  if (parts.length === 0) return "待結算";
  let net = 0;
  for (const handicap of parts) {
    const margin = scoreFor + handicap - scoreAgainst;
    if (margin > 0) net += 1;
    else if (margin < 0) net -= 1;
  }
  if (net > 0) return "贏";
  if (net < 0) return "輸";
  return "不入帳";
}

export function settleHad(home: number, away: number, selectionSide: "H" | "A" | "D"): SettlementVerdict {
  const actual = home > away ? "H" : home < away ? "A" : "D";
  return actual === selectionSide ? "贏" : "輸";
}

export function settlePick(input: {
  market: Market;
  home: number;
  away: number;
  line: string | null;
  side: "H" | "A" | "D";
}): SettlementVerdict {
  if (input.market === "HAD") return settleHad(input.home, input.away, input.side);
  if (input.market === "HIL") {
    const total = input.home + input.away;
    const parts = parseCondition(input.line ?? "");
    if (parts.length === 0) return "待結算";
    let net = 0;
    for (const line of parts) {
      const margin = input.side === "H" ? total - line : line - total;
      if (margin > 0) net += 1;
      else if (margin < 0) net -= 1;
    }
    if (net > 0) return "贏";
    if (net < 0) return "輸";
    return "不入帳";
  }
  const scoreFor = input.side === "H" ? input.home : input.away;
  const scoreAgainst = input.side === "H" ? input.away : input.home;
  return settleLine(scoreFor, scoreAgainst, input.line ?? "");
}
