import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";

const convexModules = (
  import.meta as ImportMeta & {
    glob: (pattern: string) => Record<string, () => Promise<unknown>>;
  }
).glob("../convex/**/*.*s");

function createHarness() {
  process.env.MANAGER_EMAIL_ALLOWLIST = "manager@giu-uni.de";
  return convexTest(schema, convexModules);
}

type TestHarness = ReturnType<typeof createHarness>;
type IdentityClient = ReturnType<TestHarness["withIdentity"]>;

async function listNotificationsForUser(user: IdentityClient) {
  return await user.query(api.notifications.listMine, {
    paginationOpts: { cursor: null, numItems: 30 },
  });
}

describe("auth onboarding intent behavior", () => {
  it("notifies managers when resolver access is requested during onboarding", async () => {
    const t = createHarness();
    const manager = t.withIdentity({
      tokenIdentifier: "manager-notify-1",
      email: "manager@giu-uni.de",
      emailVerified: true,
      name: "Manager Notify",
    });
    await manager.mutation(api.auth.upsertCurrentUser, { intent: "reporter" });

    const requester = t.withIdentity({
      tokenIdentifier: "resolver-notify-1",
      email: "resolver.notify@student.giu-uni.de",
      emailVerified: true,
      name: "Resolver Notify",
    });
    await requester.mutation(api.auth.upsertCurrentUser, { intent: "resolver" });

    const managerNotifications = await listNotificationsForUser(manager);
    expect(managerNotifications.page.map((item) => item.type)).toEqual(
      expect.arrayContaining(["resolver_request_submitted"]),
    );
  });

  it("allows pending users to register push tokens for decision notifications", async () => {
    const t = createHarness();
    const requester = t.withIdentity({
      tokenIdentifier: "resolver-push-pending-1",
      email: "resolver.push.pending@student.giu-uni.de",
      emailVerified: true,
      name: "Resolver Push Pending",
    });

    const access = await requester.mutation(api.auth.upsertCurrentUser, {
      intent: "resolver",
    });
    expect(access.accountStatus).toBe("pending_resolver_approval");

    await requester.mutation(api.notifications.registerPushToken, {
      expoPushToken: "ExpoPushToken[pending-user-device-token]",
      platform: "ios",
    });

    const mine = await requester.query(api.auth.getMyAccess, {});
    expect(mine?.accountStatus).toBe("pending_resolver_approval");
  });

  it("can create a self-test notification for active users", async () => {
    const t = createHarness();
    const reporter = t.withIdentity({
      tokenIdentifier: "reporter-notify-test-1",
      email: "reporter.notify.test@student.giu-uni.de",
      emailVerified: true,
      name: "Reporter Notify Test",
    });

    await reporter.mutation(api.auth.upsertCurrentUser, { intent: "reporter" });
    const response = await reporter.mutation(api.notifications.sendTestToMe, {});

    const notifications = await reporter.query(api.notifications.listMine, {
      paginationOpts: { cursor: null, numItems: 10 },
    });

    expect(notifications.page.some((item) => item._id === response.notificationId)).toBe(true);
    expect(notifications.page.some((item) => item.title === "Notification test")).toBe(true);
  });

  it("restores reporter access when reporter intent is selected after pending resolver state", async () => {
    const t = createHarness();
    const user = t.withIdentity({
      tokenIdentifier: "reporter-pending-1",
      email: "reporter.pending@student.giu-uni.de",
      emailVerified: true,
      name: "Reporter Pending",
    });

    const pendingAccess = await user.mutation(api.auth.upsertCurrentUser, {
      intent: "resolver",
    });
    expect(pendingAccess.accountStatus).toBe("pending_resolver_approval");
    expect(pendingAccess.role).toBe("reporter");

    const reporterAccess = await user.mutation(api.auth.upsertCurrentUser, {
      intent: "reporter",
    });
    expect(reporterAccess.accountStatus).toBe("active");
    expect(reporterAccess.role).toBe("reporter");

    const mine = await user.query(api.auth.getMyAccess, {});
    expect(mine?.accountStatus).toBe("active");
    expect(mine?.role).toBe("reporter");
  });

  it("does not create duplicate pending requests when toggling back to resolver intent", async () => {
    const t = createHarness();
    const user = t.withIdentity({
      tokenIdentifier: "reporter-pending-2",
      email: "reporter.pending2@student.giu-uni.de",
      emailVerified: true,
      name: "Reporter Pending Two",
    });

    const initialResolverAccess = await user.mutation(api.auth.upsertCurrentUser, {
      intent: "resolver",
    });
    expect(initialResolverAccess.latestResolverRequestStatus).toBe("pending");
    const firstRequestId = initialResolverAccess.latestResolverRequestId;
    expect(firstRequestId).not.toBeNull();

    const reporterAccess = await user.mutation(api.auth.upsertCurrentUser, {
      intent: "reporter",
    });
    expect(reporterAccess.accountStatus).toBe("active");

    const secondResolverAccess = await user.mutation(api.auth.upsertCurrentUser, {
      intent: "resolver",
    });
    expect(secondResolverAccess.accountStatus).toBe("pending_resolver_approval");
    expect(secondResolverAccess.latestResolverRequestStatus).toBe("pending");
    expect(secondResolverAccess.latestResolverRequestId).toBe(firstRequestId);
  });

  it("keeps resolver role after approval but allows reporter APIs in reporter intent", async () => {
    const t = createHarness();

    const resolverUser = t.withIdentity({
      tokenIdentifier: "resolver-switch-1",
      email: "resolver.switch@student.giu-uni.de",
      emailVerified: true,
      name: "Resolver Switch",
    });

    const resolverPendingAccess = await resolverUser.mutation(api.auth.upsertCurrentUser, {
      intent: "resolver",
    });
    expect(resolverPendingAccess.accountStatus).toBe("pending_resolver_approval");

    const manager = t.withIdentity({
      tokenIdentifier: "manager-switch-1",
      email: "manager@giu-uni.de",
      emailVerified: true,
      name: "Manager Switch",
    });

    await manager.mutation(api.auth.upsertCurrentUser, { intent: "reporter" });

    const pendingRequests = await manager.query(api.resolverRequests.listPending, {
      paginationOpts: { cursor: null, numItems: 20 },
    });

    const pendingRequest = pendingRequests.page.find(
      (request) => request.requesterUserId === resolverPendingAccess.userId,
    );
    expect(pendingRequest).toBeDefined();

    await manager.mutation(api.resolverRequests.approve, {
      requestId: pendingRequest!._id,
    });

    const resolverNotifications = await listNotificationsForUser(resolverUser);
    expect(resolverNotifications.page.map((item) => item.type)).toEqual(
      expect.arrayContaining(["resolver_request_approved"]),
    );

    const resolverAccessAfterApproval = await resolverUser.mutation(api.auth.upsertCurrentUser, {
      intent: "resolver",
    });
    expect(resolverAccessAfterApproval.role).toBe("resolver");
    expect(resolverAccessAfterApproval.accountStatus).toBe("active");

    const reporterIntentAccess = await resolverUser.mutation(api.auth.upsertCurrentUser, {
      intent: "reporter",
    });
    expect(reporterIntentAccess.role).toBe("resolver");
    expect(reporterIntentAccess.accountStatus).toBe("active");

    const uploadUrl = await resolverUser.mutation(api.ticketsReporter.generateUploadUrl, {});
    expect(typeof uploadUrl).toBe("string");
    expect(uploadUrl.length).toBeGreaterThan(0);
  });
});
