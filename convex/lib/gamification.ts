import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export const XP_PER_TICKET = 10;

/**
 * Calculates the user's level based on their XP.
 * Level 1: 0-9 XP
 * Level 2: 10-39 XP
 * Level 3: 40-89 XP
 * Level 4: 90-159 XP
 */
export function calculateLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 10)) + 1;
}

export const BADGES = {
  FIRST_REPORT: "First Report",
  CAMPUS_HERO: "Campus Hero",
  EAGLE_EYE: "Eagle Eye",
} as const;

export async function awardXPForClosedTicket(
  ctx: MutationCtx,
  reporterUserId: Id<"users">,
) {
  const user = await ctx.db.get(reporterUserId);
  if (!user || user.role !== "reporter") return;

  const currentXp = user.xp ?? 0;
  const newXp = currentXp + XP_PER_TICKET;
  const newLevel = calculateLevel(newXp);

  // Count closed tickets by this user to determine badges
  // To avoid a massive query on every close, we can just use the new XP if we assume
  // all XP comes from closed tickets, OR we can query the count.
  // We'll query tickets closed by this user.
  const closedTickets = await ctx.db
    .query("tickets")
    .withIndex("by_reporterUserId_and_createdAt", (q) =>
      q.eq("reporterUserId", reporterUserId)
    )
    .filter((q) => q.eq(q.field("status"), "closed"))
    .collect();

  // The newly closed ticket might not be fully reflected if this runs in the same mutation 
  // before the index updates, but we are inside the same transaction so it IS updated.
  const closedCount = closedTickets.length;

  const currentBadges = new Set(user.badges ?? []);

  if (closedCount >= 1) currentBadges.add(BADGES.FIRST_REPORT);
  if (closedCount >= 5) currentBadges.add(BADGES.CAMPUS_HERO);
  if (closedCount >= 10) currentBadges.add(BADGES.EAGLE_EYE);

  await ctx.db.patch(reporterUserId, {
    xp: newXp,
    level: newLevel,
    badges: Array.from(currentBadges),
  });
}
