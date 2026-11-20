import { query } from "./_generated/server";

export const jobs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("editionJobs").collect();
  },
});
