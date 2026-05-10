import { v } from "convex/values";
import { query } from "./_generated/server";
import { getVerifiedGiuEmailOrNull, getCurrentUserByTokenIdentifier } from "./lib/auth";
import { gamificationBadgeValidator } from "./lib/validators";

const myStatsValidator = v.object({
  xp: v.number(),
  level: v.number(),
  badges: v.array(gamificationBadgeValidator),
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

    return {
      xp: user.xp ?? 0,
      level: user.level ?? 1,
      badges: user.badges ?? [],
      closedTicketsCount: user.closedTicketsCount ?? 0,
    };
  },
});
