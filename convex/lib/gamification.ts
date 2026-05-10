import type { Infer } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { gamificationBadgeValidator } from "./validators";

export const XP_PER_TICKET = 10;

export type GamificationBadge = Infer<typeof gamificationBadgeValidator>;

export const BADGES = {
  FIRST_NOTICE: "first_notice",
  CAMPUS_SCOUT: "campus_scout",
  EAGLE_EYE: "eagle_eye",
  FACILITY_GUARDIAN: "facility_guardian",
  GIU_HERO: "giu_hero",
} as const satisfies Record<string, GamificationBadge>;

export function calculateLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / XP_PER_TICKET)) + 1;
}

function badgesForStats(args: {
  closedTicketsCount: number;
  level: number;
  existingBadges: ReadonlyArray<GamificationBadge>;
}): Array<GamificationBadge> {
  const badges = new Set<GamificationBadge>(args.existingBadges);

  if (args.closedTicketsCount >= 1) {
    badges.add(BADGES.FIRST_NOTICE);
  }
  if (args.level >= 2) {
    badges.add(BADGES.CAMPUS_SCOUT);
  }
  if (args.level >= 3) {
    badges.add(BADGES.EAGLE_EYE);
  }
  if (args.level >= 4) {
    badges.add(BADGES.FACILITY_GUARDIAN);
  }
  if (args.level >= 5) {
    badges.add(BADGES.GIU_HERO);
  }

  return Array.from(badges);
}

export async function awardXPForClosedTicket(
  ctx: MutationCtx,
  reporterUserId: Id<"users">,
): Promise<void> {
  const user = await ctx.db.get(reporterUserId);
  if (!user || (user.role !== "reporter" && user.role !== "resolver")) {
    return;
  }

  const xp = (user.xp ?? 0) + XP_PER_TICKET;
  const level = calculateLevel(xp);
  const closedTicketsCount = (user.closedTicketsCount ?? 0) + 1;
  const badges = badgesForStats({
    closedTicketsCount,
    level,
    existingBadges: user.badges ?? [],
  });

  await ctx.db.patch(reporterUserId, {
    xp,
    level,
    closedTicketsCount,
    badges,
  });
}
