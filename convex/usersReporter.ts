import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireRole } from "./lib/auth";
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
    const user = await requireRole(ctx, "reporter");

    return {
      xp: user.xp ?? 0,
      level: user.level ?? 1,
      badges: user.badges ?? [],
      closedTicketsCount: user.closedTicketsCount ?? 0,
    };
  },
});
