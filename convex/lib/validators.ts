import { v } from "convex/values";

export const userRoleValidator = v.union(
  v.literal("reporter"),
  v.literal("resolver"),
  v.literal("manager"),
);

export const accountStatusValidator = v.union(
  v.literal("active"),
  v.literal("pending_resolver_approval"),
  v.literal("resolver_rejected"),
);

export const resolverRequestStatusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
);

export const ticketStatusValidator = v.union(
  v.literal("open"),
  v.literal("assigned"),
  v.literal("in_progress"),
  v.literal("resolved"),
  v.literal("closed"),
);

export const onboardingIntentValidator = v.union(
  v.literal("reporter"),
  v.literal("resolver"),
);
