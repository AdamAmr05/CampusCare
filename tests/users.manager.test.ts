import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import { createHarness } from "./testHarness";

type TestHarness = ReturnType<typeof createHarness>;

async function seedReporter(t: TestHarness, suffix: string) {
  const reporter = t.withIdentity({
    tokenIdentifier: `people-reporter-${suffix}`,
    email: `people.reporter.${suffix}@student.giu-uni.de`,
    emailVerified: true,
    name: `People Reporter ${suffix}`,
  });

  const access = await reporter.mutation(api.auth.upsertCurrentUser, {
    intent: "reporter",
  });

  return { reporter, access };
}

async function seedManager(t: TestHarness, suffix = "1") {
  const manager = t.withIdentity({
    tokenIdentifier: `people-manager-${suffix}`,
    email: suffix === "1" ? "manager@giu-uni.de" : `manager.${suffix}@giu-uni.de`,
    emailVerified: true,
    name: `People Manager ${suffix}`,
  });

  const access = await manager.mutation(api.auth.upsertCurrentUser, {
    intent: "reporter",
  });

  return { manager, access };
}

async function seedApprovedResolver(t: TestHarness, suffix: string) {
  const resolver = t.withIdentity({
    tokenIdentifier: `people-resolver-${suffix}`,
    email: `people.resolver.${suffix}@student.giu-uni.de`,
    emailVerified: true,
    name: `People Resolver ${suffix}`,
  });

  const pendingAccess = await resolver.mutation(api.auth.upsertCurrentUser, {
    intent: "resolver",
  });
  const { manager } = await seedManager(t);
  const pendingRequests = await manager.query(api.resolverRequests.listPending, {
    paginationOpts: { cursor: null, numItems: 50 },
  });
  const pendingRequest = pendingRequests.page.find(
    (request) => request.requesterUserId === pendingAccess.userId,
  );

  if (!pendingRequest) {
    throw new Error("Expected resolver request to be pending.");
  }

  await manager.mutation(api.resolverRequests.approve, {
    requestId: pendingRequest._id,
  });

  const access = await resolver.query(api.auth.getMyAccess, {});
  if (!access) {
    throw new Error("Expected resolver access after approval.");
  }

  return { resolver, access, manager };
}

describe("manager user directory", () => {
  it("shows operational users to managers without exposing reporters in the directory", async () => {
    const t = createHarness();
    const { manager } = await seedManager(t);
    const { access: resolverAccess } = await seedApprovedResolver(t, "directory-1");
    const { access: reporterAccess } = await seedReporter(t, "directory-1");

    const resolvers = await manager.query(api.usersManager.listDirectory, {
      filter: "resolvers",
      paginationOpts: { cursor: null, numItems: 20 },
    });
    const managers = await manager.query(api.usersManager.listDirectory, {
      filter: "managers",
      paginationOpts: { cursor: null, numItems: 20 },
    });

    expect(resolvers.page.map((user) => user._id)).toContain(resolverAccess.userId);
    expect(resolvers.page.map((user) => user._id)).not.toContain(reporterAccess.userId);
    expect(managers.page.map((user) => user.email)).toContain("manager@giu-uni.de");
  });

  it("rejects directory reads and resolver deactivation from non-manager accounts", async () => {
    const t = createHarness();
    const { reporter } = await seedReporter(t, "access-1");
    const { access: resolverAccess } = await seedApprovedResolver(t, "access-1");

    await expect(
      reporter.query(api.usersManager.listDirectory, {
        filter: "resolvers",
        paginationOpts: { cursor: null, numItems: 20 },
      }),
    ).rejects.toThrow(/Not authorized/);

    await expect(
      reporter.mutation(api.usersManager.deactivateResolver, {
        userId: resolverAccess.userId,
      }),
    ).rejects.toThrow(/Not authorized/);
  });

  it("moves a deactivated resolver out of active assignment options and restores them on reactivation", async () => {
    const t = createHarness();
    const { resolver, access, manager } = await seedApprovedResolver(t, "deactivate-1");

    await manager.mutation(api.usersManager.deactivateResolver, {
      userId: access.userId,
    });

    await expect(
      resolver.query(api.ticketsResolver.listAssignedToMe, {
        paginationOpts: { cursor: null, numItems: 10 },
      }),
    ).rejects.toThrow(/deactivated/);
    await expect(
      resolver.mutation(api.resolverRequests.create, {}),
    ).rejects.toThrow(/deactivated/);

    const activeResolversAfterDeactivate = await manager.query(
      api.ticketsManager.listActiveResolvers,
      {},
    );
    const inactiveResolvers = await manager.query(api.usersManager.listInactiveResolvers, {
      paginationOpts: { cursor: null, numItems: 20 },
    });

    expect(activeResolversAfterDeactivate.map((user) => user._id)).not.toContain(access.userId);
    expect(inactiveResolvers.page.map((user) => user._id)).toContain(access.userId);

    await manager.mutation(api.usersManager.reactivateResolver, {
      userId: access.userId,
    });

    const activeResolversAfterReactivate = await manager.query(
      api.ticketsManager.listActiveResolvers,
      {},
    );
    const resolverAccessAfterReactivate = await resolver.query(api.auth.getMyAccess, {});

    expect(activeResolversAfterReactivate.map((user) => user._id)).toContain(access.userId);
    expect(resolverAccessAfterReactivate?.accountStatus).toBe("active");
  });

  it("caps directory approval counts instead of reporting a false exact total", async () => {
    const t = createHarness();
    const { manager } = await seedManager(t);

    for (let index = 0; index < 201; index += 1) {
      const requester = t.withIdentity({
        tokenIdentifier: `people-pending-${index}`,
        email: `people.pending.${index}@student.giu-uni.de`,
        emailVerified: true,
        name: `People Pending ${index}`,
      });
      await requester.mutation(api.auth.upsertCurrentUser, {
        intent: "resolver",
      });
    }

    const counts = await manager.query(api.usersManager.directoryCounts, {});

    expect(counts.approvals).toEqual({ value: 200, isCapped: true });
    expect(counts.resolvers).toEqual({ value: 0, isCapped: false });
  });
});
