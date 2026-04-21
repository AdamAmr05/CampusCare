import { describe, expect, it } from "vitest";
import {
  buildUserPatch,
  resolveExistingAccess,
  resolveNewAccess,
} from "../convex/lib/accessTransitions";

describe("access transition helpers", () => {
  it("creates manager access immediately for allowlisted accounts", () => {
    expect(resolveNewAccess("reporter", true)).toEqual({
      role: "manager",
      accountStatus: "active",
      shouldCreateResolverRequest: false,
    });
  });

  it("creates a pending reporter state for new resolver intent users", () => {
    expect(resolveNewAccess("resolver", false)).toEqual({
      role: "reporter",
      accountStatus: "pending_resolver_approval",
      shouldCreateResolverRequest: true,
    });
  });

  it("keeps rejected resolver applicants rejected until they explicitly reapply", () => {
    expect(
      resolveExistingAccess({
        current: {
          role: "reporter",
          accountStatus: "resolver_rejected",
        },
        intent: "resolver",
        managerAccount: false,
      }),
    ).toEqual({
      role: "reporter",
      accountStatus: "resolver_rejected",
      shouldCreateResolverRequest: false,
    });
  });

  it("restores reporter access when a pending reporter switches back to reporter intent", () => {
    expect(
      resolveExistingAccess({
        current: {
          role: "reporter",
          accountStatus: "pending_resolver_approval",
        },
        intent: "reporter",
        managerAccount: false,
      }),
    ).toEqual({
      role: "reporter",
      accountStatus: "active",
      shouldCreateResolverRequest: false,
    });
  });

  it("demotes removed managers back to reporter state based on current intent", () => {
    expect(
      resolveExistingAccess({
        current: {
          role: "manager",
          accountStatus: "active",
        },
        intent: "resolver",
        managerAccount: false,
      }),
    ).toEqual({
      role: "reporter",
      accountStatus: "pending_resolver_approval",
      shouldCreateResolverRequest: true,
    });
  });

  it("preserves active resolver access even when reporter intent is selected", () => {
    expect(
      resolveExistingAccess({
        current: {
          role: "resolver",
          accountStatus: "active",
        },
        intent: "reporter",
        managerAccount: false,
      }),
    ).toEqual({
      role: "resolver",
      accountStatus: "active",
      shouldCreateResolverRequest: false,
    });
  });

  it("builds a patch only when access state or profile fields change", () => {
    expect(
      buildUserPatch({
        current: {
          role: "reporter",
          accountStatus: "active",
          email: "old@student.giu-uni.de",
          fullName: "Old Name",
        },
        next: {
          role: "reporter",
          accountStatus: "pending_resolver_approval",
        },
        profile: {
          email: "new@student.giu-uni.de",
          fullName: "New Name",
        },
        now: 42,
      }),
    ).toEqual({
      role: "reporter",
      accountStatus: "pending_resolver_approval",
      email: "new@student.giu-uni.de",
      fullName: "New Name",
      updatedAt: 42,
    });

    expect(
      buildUserPatch({
        current: {
          role: "reporter",
          accountStatus: "active",
          email: "same@student.giu-uni.de",
          fullName: "Same Name",
        },
        next: {
          role: "reporter",
          accountStatus: "active",
        },
        profile: {
          email: "same@student.giu-uni.de",
          fullName: "Same Name",
        },
        now: 99,
      }),
    ).toBeNull();
  });
});
