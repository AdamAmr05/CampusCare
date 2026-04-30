import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { assertValidTicketImageFile } from "../convex/lib/tickets";
import { createHarness } from "./testHarness";

type TestHarness = ReturnType<typeof createHarness>;
type IdentityClient = ReturnType<TestHarness["withIdentity"]>;
const TICKET_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

async function createStorageFileId(
  t: TestHarness,
  args: { contentType: string; sizeBytes: number },
): Promise<Id<"_storage">> {
  return await t.run(async (ctx) => {
    const bytes = new Uint8Array(args.sizeBytes);
    return await ctx.storage.store(new Blob([bytes], { type: args.contentType }));
  });
}

async function createStorageImageId(t: TestHarness): Promise<Id<"_storage">> {
  return await createStorageFileId(t, {
    contentType: "image/jpeg",
    sizeBytes: 16,
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

async function listNotificationsForUser(user: IdentityClient) {
  return await user.query(api.notifications.listMine, {
    paginationOpts: { cursor: null, numItems: 50 },
  });
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

    const reporterNotifications = await listNotificationsForUser(reporter);
    const managerNotifications = await listNotificationsForUser(manager);
    const resolverNotifications = await listNotificationsForUser(resolver);

    expect(reporterNotifications.page.map((item) => item.type)).toEqual(
      expect.arrayContaining([
        "ticket_assigned",
        "ticket_in_progress",
        "ticket_resolved",
        "ticket_closed",
      ]),
    );
    expect(managerNotifications.page.map((item) => item.type)).toEqual(
      expect.arrayContaining(["ticket_created", "ticket_resolved"]),
    );
    expect(resolverNotifications.page.map((item) => item.type)).toEqual(
      expect.arrayContaining(["ticket_assigned", "ticket_closed"]),
    );
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

  it("rejects changing resolution note after resolved", async () => {
    const t = createHarness();
    const { reporter } = await seedReporter(t, "7");
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
      resolutionNote: "Initial fix applied.",
    });

    await expect(
      resolver.mutation(api.ticketsResolver.markResolved, {
        ticketId,
        resolutionNote: "Different note attempt.",
      }),
    ).rejects.toThrow(/already resolved and awaiting manager closure/);
  });

  it("allows resolver to add an optional resolution image while resolving", async () => {
    const t = createHarness();
    const { reporter } = await seedReporter(t, "11");
    const { manager, resolver, resolverAccessAfterApproval } =
      await seedResolverAndApprove(t);

    const ticketId = await createTicketAsReporter(t, reporter);
    const resolutionImageStorageId = await createStorageImageId(t);

    await manager.mutation(api.ticketsManager.assignResolver, {
      ticketId,
      resolverUserId: resolverAccessAfterApproval.userId,
    });

    await resolver.mutation(api.ticketsResolver.setInProgress, {
      ticketId,
    });

    await resolver.mutation(api.ticketsResolver.markResolved, {
      ticketId,
      resolutionNote: "Replaced fixture and uploaded completion evidence.",
      resolutionImageStorageId,
    });

    const details = await manager.query(api.ticketsShared.getById, {
      ticketId,
    });

    expect(details).not.toBeNull();
    if (!details) {
      throw new Error("Ticket details should not be null.");
    }

    expect(details.ticket.resolutionImageStorageId).toBe(resolutionImageStorageId);
    expect(details.ticket.resolutionImageUrl).toBeTruthy();
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

  it("rejects oversized resolution attachments", async () => {
    const t = createHarness();
    const { reporter } = await seedReporter(t, "12");
    const { manager, resolver, resolverAccessAfterApproval } =
      await seedResolverAndApprove(t);

    const ticketId = await createTicketAsReporter(t, reporter);
    const oversizedResolutionImageId = await createStorageFileId(t, {
      contentType: "image/jpeg",
      sizeBytes: TICKET_IMAGE_MAX_BYTES + 1,
    });

    await manager.mutation(api.ticketsManager.assignResolver, {
      ticketId,
      resolverUserId: resolverAccessAfterApproval.userId,
    });

    await resolver.mutation(api.ticketsResolver.setInProgress, { ticketId });

    await expect(
      resolver.mutation(api.ticketsResolver.markResolved, {
        ticketId,
        resolutionNote: "Attempted with oversized attachment.",
        resolutionImageStorageId: oversizedResolutionImageId,
      }),
    ).rejects.toThrow(/8MB or smaller/);
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

  it("rejects non-image content types when metadata is available", () => {
    expect(() =>
      assertValidTicketImageFile({ contentType: "text/plain", size: 16 }),
    ).toThrow(/Uploaded file must be an image/);
  });

  it("rejects images above the configured size limit", async () => {
    const t = createHarness();
    const { reporter } = await seedReporter(t, "9");
    const tooLargeImageId = await createStorageFileId(t, {
      contentType: "image/jpeg",
      sizeBytes: TICKET_IMAGE_MAX_BYTES + 1,
    });

    await expect(
      reporter.mutation(api.ticketsReporter.create, {
        category: "Electrical",
        description: "Image too large test.",
        location: "Building C - Floor 2",
        imageStorageId: tooLargeImageId,
      }),
    ).rejects.toThrow(/8MB or smaller/);
  });

  it("returns capped manager monitor counts when a status exceeds the display cap", async () => {
    const t = createHarness();
    const { access } = await seedReporter(t, "13");
    const { manager } = await seedManager(t);
    const imageStorageId = await createStorageImageId(t);

    await t.run(async (ctx) => {
      const now = Date.now();
      await Promise.all(
        Array.from({ length: 201 }, (_, index) =>
          ctx.db.insert("tickets", {
            reporterUserId: access.userId,
            managerUserId: null,
            resolverUserId: null,
            category: "Electrical",
            description: `Monitor count cap test ${index}`,
            location: "Building B - Floor 2",
            imageStorageId,
            resolutionImageStorageId: null,
            status: "open",
            resolutionNote: null,
            createdAt: now + index,
            updatedAt: now + index,
            resolvedAt: null,
            closedAt: null,
          }),
        ),
      );
    });

    const counts = await manager.query(api.ticketsManager.monitorCounts, {});

    expect(counts.open).toEqual({ value: 200, isCapped: true });
    expect(counts.assigned).toEqual({ value: 0, isCapped: false });
  });

  it("orders the all-ticket manager monitor by latest ticket update", async () => {
    const t = createHarness();
    const { reporter } = await seedReporter(t, "14");
    const { manager } = await seedManager(t);

    const olderTicketId = await createTicketAsReporter(t, reporter);
    const newerTicketId = await createTicketAsReporter(t, reporter);

    await t.run(async (ctx) => {
      await ctx.db.patch(olderTicketId, {
        updatedAt: Date.now() + 60_000,
      });
    });

    const monitorPage = await manager.query(api.ticketsManager.listMonitor, {
      statusFilter: "all",
      paginationOpts: { cursor: null, numItems: 2 },
    });

    expect(monitorPage.page.map((ticket) => ticket._id)).toEqual([
      olderTicketId,
      newerTicketId,
    ]);
  });

  it("deletes only unreferenced uploads", async () => {
    const t = createHarness();
    const { reporter } = await seedReporter(t, "10");
    const { manager, resolver, resolverAccessAfterApproval } =
      await seedResolverAndApprove(t);

    const unusedUploadId = await createStorageImageId(t);
    await reporter.mutation(api.ticketsReporter.deleteUnusedUpload, {
      storageId: unusedUploadId,
    });

    const deletedMetadata = await t.run(async (ctx) => {
      return await ctx.db.system.get("_storage", unusedUploadId);
    });
    expect(deletedMetadata).toBeNull();

    const ticketImageId = await createStorageImageId(t);
    await reporter.mutation(api.ticketsReporter.create, {
      category: "Plumbing",
      description: "Sink is leaking.",
      location: "Building D - Floor 1",
      imageStorageId: ticketImageId,
    });

    await reporter.mutation(api.ticketsReporter.deleteUnusedUpload, {
      storageId: ticketImageId,
    });

    const keptMetadata = await t.run(async (ctx) => {
      return await ctx.db.system.get("_storage", ticketImageId);
    });
    expect(keptMetadata).not.toBeNull();

    const resolutionImageId = await createStorageImageId(t);
    const ticketId = await createTicketAsReporter(t, reporter);

    await manager.mutation(api.ticketsManager.assignResolver, {
      ticketId,
      resolverUserId: resolverAccessAfterApproval.userId,
    });

    await resolver.mutation(api.ticketsResolver.setInProgress, {
      ticketId,
    });

    await resolver.mutation(api.ticketsResolver.markResolved, {
      ticketId,
      resolutionNote: "Resolved with photo evidence.",
      resolutionImageStorageId: resolutionImageId,
    });

    await reporter.mutation(api.ticketsReporter.deleteUnusedUpload, {
      storageId: resolutionImageId,
    });

    const keptResolutionMetadata = await t.run(async (ctx) => {
      return await ctx.db.system.get("_storage", resolutionImageId);
    });
    expect(keptResolutionMetadata).not.toBeNull();
  });
});
