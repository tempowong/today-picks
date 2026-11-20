import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { compareMatches } from "./order";
import type { EditionView, SeedMatch, TodayBoard } from "../src/domain/view";

const STALE_VERIFIED_AT = "14:02";

function toMatch(doc: Doc<"matches">): SeedMatch {
  return {
    id: doc.id,
    kickoffHkt: doc.kickoffHkt,
    phase: doc.phase,
    home: doc.home,
    away: doc.away,
    ...(doc.awayMayBeNeutral ? { awayMayBeNeutral: doc.awayMayBeNeutral } : {}),
    decision: doc.decision,
    hero: doc.hero,
    stamp: doc.stamp,
    ...(doc.confidence ? { confidence: doc.confidence } : {}),
    flags: doc.flags,
    invalidation: doc.invalidation,
    path: doc.path,
    filters: doc.filters,
    ...(doc.verifiedAtHkt ? { verifiedAtHkt: doc.verifiedAtHkt } : {}),
    ...(doc.inPlayUpdatedAtHkt ? { inPlayUpdatedAtHkt: doc.inPlayUpdatedAtHkt } : {}),
    view: doc.view,
  };
}

function editionView(
  edition: Doc<"editions">,
  freshness: EditionView["freshness"],
  verifiedAtHkt: string,
): EditionView {
  return {
    label: edition.label,
    dateLabel: edition.dateLabel,
    verifiedAtHkt,
    freshness,
    disclaimer: edition.disclaimer,
  };
}

export const today = query({
  args: {
    board: v.union(v.literal("demo"), v.literal("empty"), v.literal("stale"), v.literal("error")),
  },
  handler: async (ctx, args): Promise<TodayBoard | null> => {
    if (args.board === "error") {
      throw new ConvexError({ message: "無法讀取公開彩池" });
    }
    const edition = await ctx.db
      .query("editions")
      .withIndex("by_key", (q) => q.eq("key", "demo"))
      .unique();
    if (!edition) return null;
    if (args.board === "empty") {
      return { edition: editionView(edition, "empty", edition.verifiedAtHkt), matches: [] };
    }
    const stored = await ctx.db
      .query("matches")
      .withIndex("by_edition", (q) => q.eq("editionKey", "demo"))
      .collect();
    const matches = stored.map(toMatch).sort(compareMatches);
    if (args.board === "stale") {
      return { edition: editionView(edition, "stale", STALE_VERIFIED_AT), matches };
    }
    return { edition: editionView(edition, "current", edition.verifiedAtHkt), matches };
  },
});
