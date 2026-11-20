import { mutation } from "./_generated/server";
import { EDITION, FIXTURES } from "./fixtures";

export const reset = mutation({
  args: {},
  handler: async (ctx) => {
    const matches = await ctx.db.query("matches").collect();
    for (const match of matches) await ctx.db.delete(match._id);
    const editions = await ctx.db.query("editions").collect();
    for (const edition of editions) await ctx.db.delete(edition._id);
    await ctx.db.insert("editions", EDITION);
    for (const fixture of FIXTURES) {
      await ctx.db.insert("matches", { ...fixture, editionKey: "demo" });
    }
    return { matches: FIXTURES.length };
  },
});
