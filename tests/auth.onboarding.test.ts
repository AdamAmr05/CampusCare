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

describe("auth onboarding intent behavior", () => {
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
