import type { UserIdentity } from "convex/server";
import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { getManagerAllowlist, normalizeEmail } from "./env";

type AuthCtx = QueryCtx | MutationCtx;

const GIU_ROOT_DOMAIN = "giu-uni.de";

export function getDisplayName(identity: UserIdentity, normalizedEmail: string): string {
  const identityName = typeof identity.name === "string" ? identity.name.trim() : "";
  if (identityName.length > 0) {
    return identityName;
  }

  const localPart = normalizedEmail.split("@")[0] ?? "";
  return localPart.length > 0 ? localPart : "CampusCare User";
}

export async function requireIdentity(ctx: AuthCtx): Promise<UserIdentity> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new ConvexError("Not authenticated");
  }

  return identity;
}

export function isAllowedGiuEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  const atIndex = normalized.lastIndexOf("@");
  if (atIndex === -1 || atIndex === normalized.length - 1) {
    return false;
  }

  const domain = normalized.slice(atIndex + 1);
  return domain === GIU_ROOT_DOMAIN || domain.endsWith(`.${GIU_ROOT_DOMAIN}`);
}

export function getVerifiedGiuEmailOrNull(identity: UserIdentity): string | null {
  const email = typeof identity.email === "string" ? normalizeEmail(identity.email) : "";
  if (email.length === 0) {
    return null;
  }

  if (identity.emailVerified !== true) {
    return null;
  }

  if (!isAllowedGiuEmail(email)) {
    return null;
  }

  return email;
}

export function requireVerifiedGiuEmail(identity: UserIdentity): string {
  const email = typeof identity.email === "string" ? normalizeEmail(identity.email) : "";
  if (email.length === 0) {
    throw new ConvexError("A verified email address is required.");
  }

  if (identity.emailVerified !== true) {
    throw new ConvexError("Email verification is required before app access.");
  }

  if (!isAllowedGiuEmail(email)) {
    throw new ConvexError(
      "Only verified @giu-uni.de accounts (including subdomains like student.giu-uni.de) can access CampusCare.",
    );
  }

  return email;
}

export function isManagerEmail(email: string): boolean {
  return getManagerAllowlist().has(normalizeEmail(email));
}

export async function getCurrentUserByTokenIdentifier(
  ctx: AuthCtx,
  tokenIdentifier: string,
): Promise<Doc<"users"> | null> {
  return await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (query) => query.eq("tokenIdentifier", tokenIdentifier))
    .unique();
}

export async function requireCurrentUser(ctx: AuthCtx): Promise<Doc<"users">> {
  const identity = await requireIdentity(ctx);
  requireVerifiedGiuEmail(identity);
  const user = await getCurrentUserByTokenIdentifier(ctx, identity.tokenIdentifier);

  if (!user) {
    throw new ConvexError("User is not onboarded.");
  }

  return user;
}

export async function requireActiveUser(ctx: AuthCtx): Promise<Doc<"users">> {
  const user = await requireCurrentUser(ctx);
  if (user.accountStatus === "inactive") {
    throw new ConvexError("Account has been deactivated by a manager.");
  }
  if (user.accountStatus !== "active") {
    throw new ConvexError("Account is pending manager approval.");
  }

  return user;
}

export async function requireRole(
  ctx: AuthCtx,
  role: "reporter" | "resolver" | "manager",
): Promise<Doc<"users">> {
  const user = await requireActiveUser(ctx);
  if (user.role !== role) {
    throw new ConvexError("Not authorized for this operation.");
  }

  return user;
}

export async function requireRoleIn(
  ctx: AuthCtx,
  roles: ReadonlyArray<"reporter" | "resolver" | "manager">,
): Promise<Doc<"users">> {
  const user = await requireActiveUser(ctx);
  if (!roles.includes(user.role)) {
    throw new ConvexError("Not authorized for this operation.");
  }

  return user;
}
