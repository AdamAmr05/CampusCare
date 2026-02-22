import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
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

async function createStorageImageId(t: TestHarness): Promise<Id<"_storage">> {
  return await t.run(async (ctx) => {
    return await ctx.storage.store(
      new Blob(["fake image"], { type: "image/jpeg" }),
    );
  });
}

async function seedReporter(t: TestHarness, suffix: string) {
  const reporter = t.withIdentity({
    tokenIdentifier: `reporter-${suffix}`,
    email: `reporter${suffix}@student.giu-uni.de`,
    emailVerified: true,
    name: `Reporter ${suffix}`,
  });

  const access = await reporter.mutation(api.auth.upsertCurrentUser, {
    intent: "reporter",
  });

  return { reporter, access };
}

async function seedManager(t: TestHarness) {
  const manager = t.withIdentity({
    tokenIdentifier: "manager-1",
    email: "manager@giu-uni.de",
    emailVerified: true,
    name: "Campus Manager",
  });

  const access = await manager.mutation(api.auth.upsertCurrentUser, {
    intent: "reporter",
  });

  return { manager, access };
}

async function seedResolverAndApprove(t: TestHarness) {
  const resolver = t.withIdentity({
    tokenIdentifier: "resolver-1",
    email: "resolver@student.giu-uni.de",
    emailVerified: true,
    name: "Resolver One",
  });

  const resolverAccessBeforeApproval = await resolver.mutation(
    api.auth.upsertCurrentUser,
    { intent: "resolver" },
  );

  const { manager } = await seedManager(t);
  const pendingRequests = await manager.query(api.resolverRequests.listPending, {
    paginationOpts: { cursor: null, numItems: 20 },
  });

  const pendingRequest = pendingRequests.page.find(
    (request) => request.requesterUserId === resolverAccessBeforeApproval.userId,
  );

  if (!pendingRequest) {
    throw new Error("Expected pending resolver request.");
  }

  await manager.mutation(api.resolverRequests.approve, {
    requestId: pendingRequest._id,
  });

  const resolverAccessAfterApproval = await resolver.query(api.auth.getMyAccess, {});
  if (!resolverAccessAfterApproval) {
    throw new Error("Expected resolver access after approval.");
  }

  return { manager, resolver, resolverAccessAfterApproval };
}

async function createTicketAsReporter(
  t: TestHarness,
  reporter: IdentityClient,
) {
  const imageStorageId = await createStorageImageId(t);

  const response = await reporter.mutation(api.ticketsReporter.create, {
    category: "Electrical",
    description: "Hallway light is flickering frequently.",
    location: "Building B - Floor 2",
    imageStorageId,
  });

  return response.ticketId;
}

describe("ticket lifecycle and access control", () => {
  it("supports create -> assign -> in_progress -> resolved -> closed with append-only history", async () => {
    const t = createHarness();
    const { reporter } = await seedReporter(t, "1");
    const { manager, resolver, resolverAccessAfterApproval } =
      await seedResolverAndApprove(t);

    const ticketId = await createTicketAsReporter(t, reporter);

    await manager.mutation(api.ticketsManager.assignResolver, {
      ticketId,
      resolverUserId: resolverAccessAfterApproval.userId,
      note: "Assigning to on-duty resolver.",
    });

    await resolver.mutation(api.ticketsResolver.setInProgress, {
      ticketId,
      note: "Started diagnosis.",
    });

    await resolver.mutation(api.ticketsResolver.markResolved, {
      ticketId,
      resolutionNote: "Replaced faulty ballast and verified stable output.",
    });

    await manager.mutation(api.ticketsManager.close, {
      ticketId,
      note: "Verified on site.",
    });

    const details = await manager.query(api.ticketsShared.getById, {
      ticketId,
    });

    expect(details).not.toBeNull();
    if (!details) {
      throw new Error("Ticket details should not be null.");
    }

    expect(details.ticket.status).toBe("closed");
    expect(details.ticket.resolutionNote).toBe(
      "Replaced faulty ballast and verified stable output.",
    );

    const transitions = details.history.map((entry) => ({
      from: entry.fromStatus,
      to: entry.toStatus,
    }));

    expect(transitions).toEqual([
      { from: null, to: "open" },
      { from: "open", to: "assigned" },
      { from: "assigned", to: "in_progress" },
      { from: "in_progress", to: "resolved" },
      { from: "resolved", to: "closed" },
    ]);
  });

  it("blocks manager close before resolver marks resolved", async () => {
    const t = createHarness();
    const { reporter } = await seedReporter(t, "2");
    const { manager, resolverAccessAfterApproval } =
      await seedResolverAndApprove(t);

    const ticketId = await createTicketAsReporter(t, reporter);

    await manager.mutation(api.ticketsManager.assignResolver, {
      ticketId,
      resolverUserId: resolverAccessAfterApproval.userId,
    });

    await expect(
      manager.mutation(api.ticketsManager.close, { ticketId }),
    ).rejects.toThrow(/Invalid status transition/);
  });

  it("requires a non-empty resolution note", async () => {
    const t = createHarness();
    const { reporter } = await seedReporter(t, "3");
    const { manager, resolver, resolverAccessAfterApproval } =
      await seedResolverAndApprove(t);

    const ticketId = await createTicketAsReporter(t, reporter);

    await manager.mutation(api.ticketsManager.assignResolver, {
      ticketId,
      resolverUserId: resolverAccessAfterApproval.userId,
    });

    await resolver.mutation(api.ticketsResolver.setInProgress, {
      ticketId,
    });

    await expect(
      resolver.mutation(api.ticketsResolver.markResolved, {
        ticketId,
        resolutionNote: "   ",
      }),
    ).rejects.toThrow(/Resolution note is required/);
  });

  it("allows only managers to close resolved tickets", async () => {
    const t = createHarness();
    const { reporter } = await seedReporter(t, "4");
    const { manager, resolver, resolverAccessAfterApproval } =
      await seedResolverAndApprove(t);

    const ticketId = await createTicketAsReporter(t, reporter);

    await manager.mutation(api.ticketsManager.assignResolver, {
      ticketId,
      resolverUserId: resolverAccessAfterApproval.userId,
    });

    await resolver.mutation(api.ticketsResolver.setInProgress, { ticketId });
    await resolver.mutation(api.ticketsResolver.markResolved, {
      ticketId,
      resolutionNote: "Issue fixed and validated.",
    });

    await expect(
      resolver.mutation(api.ticketsManager.close, { ticketId }),
    ).rejects.toThrow(/Not authorized for this operation/);
  });

  it("prevents reporters from viewing other reporters' tickets", async () => {
    const t = createHarness();
    const { reporter: reporterA } = await seedReporter(t, "5");
    const { reporter: reporterB } = await seedReporter(t, "6");

    const ticketId = await createTicketAsReporter(t, reporterA);

    await expect(
      reporterB.query(api.ticketsShared.getById, { ticketId }),
    ).rejects.toThrow(/Not authorized to view this ticket/);
  });
});
