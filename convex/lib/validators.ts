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

export const notificationTypeValidator = v.union(
  v.literal("ticket_created"),
  v.literal("ticket_assigned"),
  v.literal("ticket_in_progress"),
  v.literal("ticket_resolved"),
  v.literal("ticket_closed"),
  v.literal("resolver_request_submitted"),
  v.literal("resolver_request_approved"),
  v.literal("resolver_request_rejected"),
);

export const pushPlatformValidator = v.union(
  v.literal("ios"),
  v.literal("android"),
  v.literal("web"),
  v.literal("unknown"),
);

export const onboardingIntentValidator = v.union(
  v.literal("reporter"),
  v.literal("resolver"),
);
