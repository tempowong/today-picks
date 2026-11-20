import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const sources = v.tuple(v.literal("bet.hkjc.com"), v.literal("football.hkjc.com"));

export default defineSchema({
  editionJobs: defineTable({
    window: v.union(
      v.literal("07:00"),
      v.literal("10:00"),
      v.literal("13:00"),
      v.literal("16:00"),
      v.literal("19:00"),
      v.literal("22:00"),
    ),
    status: v.union(
      v.literal("等待"),
      v.literal("提取中"),
      v.literal("分析中"),
      v.literal("已刊出"),
      v.literal("提取失敗"),
    ),
    fetchedAtHkt: v.union(v.string(), v.null()),
    sources,
  }).index("by_window", ["window"]),
});
