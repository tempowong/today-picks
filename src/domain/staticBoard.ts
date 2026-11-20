import { EDITION, FIXTURES } from "../../convex/fixtures.ts";
import { compareMatches } from "./order.ts";
import type { TodayBoard } from "./view.ts";

const STALE_VERIFIED_AT = "14:02";

/** Same board shapes as the Convex query, built from the demo fixtures for GitHub Pages. */
export function staticBoard(board: "demo" | "empty" | "stale" | "error"): TodayBoard {
  if (board === "error") {
    throw new Error("無法讀取公開彩池");
  }
  const edition = {
    label: EDITION.label,
    dateLabel: EDITION.dateLabel,
    disclaimer: EDITION.disclaimer,
  };
  if (board === "empty") {
    return {
      edition: { ...edition, verifiedAtHkt: EDITION.verifiedAtHkt, freshness: "empty" },
      matches: [],
    };
  }
  const matches = [...FIXTURES].sort(compareMatches);
  if (board === "stale") {
    return {
      edition: { ...edition, verifiedAtHkt: STALE_VERIFIED_AT, freshness: "stale" },
      matches,
    };
  }
  return {
    edition: { ...edition, verifiedAtHkt: EDITION.verifiedAtHkt, freshness: "current" },
    matches,
  };
}
