import { v } from "convex/values";
import { query } from "./_generated/server";
import { getVerifiedGiuEmailOrNull, getCurrentUserByTokenIdentifier } from "./lib/auth";

const myStatsValidator = v.object({
  xp: v.number(),
  level: v.number(),
  badges: v.array(v.string()),
  closedTicketsCount: v.number(),
});

export const myStats = query({
  args: {},
  returns: v.union(myStatsValidator, v.null()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const email = getVerifiedGiuEmailOrNull(identity);
    if (!email) return null;

    const user = await getCurrentUserByTokenIdentifier(ctx, identity.tokenIdentifier);
    if (!user || user.role !== "reporter") return null;

    const closedTickets = await ctx.db
      .query("tickets")
      .withIndex("by_reporterUserId_and_createdAt", (q) =>
        q.eq("reporterUserId", user._id)
      )
      .filter((q) => q.eq(q.field("status"), "closed"))
      .collect();

    return {
      xp: user.xp ?? 0,
      level: user.level ?? 1,
      badges: user.badges ?? [],
      closedTicketsCount: closedTickets.length,
    };
  },
});
