import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const reset = mutation({
  args: {},
  handler: async () => {
    return { ok: true as const };
  },
});

export const note = mutation({
  args: { window: v.string() },
  handler: async (_ctx, args) => args.window,
});
