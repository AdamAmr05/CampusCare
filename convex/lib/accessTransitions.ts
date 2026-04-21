import type { Doc } from "../_generated/dataModel";

type OnboardingIntent = "reporter" | "resolver";

type AccessState = Pick<Doc<"users">, "role" | "accountStatus">;
type UserProfileSnapshot = Pick<Doc<"users">, "email" | "fullName">;

type MutableUserFields = Pick<
  Doc<"users">,
  "role" | "accountStatus" | "email" | "fullName" | "updatedAt"
>;

export type AccessDecision = AccessState & {
  shouldCreateResolverRequest: boolean;
};

type ExistingAccessInput = {
  current: AccessState;
  intent: OnboardingIntent;
  managerAccount: boolean;
};

type UserPatchInput = {
  current: AccessState & UserProfileSnapshot;
  next: AccessState;
  profile: UserProfileSnapshot;
  now: number;
};

function getReporterAccessState(intent: OnboardingIntent): AccessState {
  return {
    role: "reporter",
    accountStatus:
      intent === "resolver" ? "pending_resolver_approval" : "active",
  };
}

function shouldRestoreReporterAccess(
  current: AccessState,
  intent: OnboardingIntent,
): boolean {
  return (
    intent === "reporter" &&
    current.role !== "resolver" &&
    (current.accountStatus === "resolver_rejected" ||
      current.accountStatus === "pending_resolver_approval")
  );
}

export function resolveNewAccess(
  intent: OnboardingIntent,
  managerAccount: boolean,
): AccessDecision {
  if (managerAccount) {
    return {
      role: "manager",
      accountStatus: "active",
      shouldCreateResolverRequest: false,
    };
  }

  const reporterState = getReporterAccessState(intent);

  return {
    ...reporterState,
    shouldCreateResolverRequest:
      reporterState.accountStatus === "pending_resolver_approval",
  };
}

export function resolveExistingAccess(
  args: ExistingAccessInput,
): AccessDecision {
  if (args.managerAccount) {
    return {
      role: "manager",
      accountStatus: "active",
      shouldCreateResolverRequest: false,
    };
  }

  if (args.current.role === "manager") {
    const reporterState = getReporterAccessState(args.intent);

    return {
      ...reporterState,
      shouldCreateResolverRequest:
        reporterState.accountStatus === "pending_resolver_approval",
    };
  }

  if (args.intent === "resolver" && args.current.role !== "resolver") {
    if (args.current.accountStatus === "resolver_rejected") {
      return {
        role: "reporter",
        accountStatus: "resolver_rejected",
        shouldCreateResolverRequest: false,
      };
    }

    return {
      role: "reporter",
      accountStatus: "pending_resolver_approval",
      shouldCreateResolverRequest: true,
    };
  }

  if (shouldRestoreReporterAccess(args.current, args.intent)) {
    return {
      role: "reporter",
      accountStatus: "active",
      shouldCreateResolverRequest: false,
    };
  }

  return {
    ...args.current,
    shouldCreateResolverRequest: false,
  };
}

export function buildUserPatch(args: UserPatchInput): MutableUserFields | null {
  const shouldPatch =
    args.current.role !== args.next.role ||
    args.current.accountStatus !== args.next.accountStatus ||
    args.current.email !== args.profile.email ||
    args.current.fullName !== args.profile.fullName;

  if (!shouldPatch) {
    return null;
  }

  return {
    role: args.next.role,
    accountStatus: args.next.accountStatus,
    email: args.profile.email,
    fullName: args.profile.fullName,
    updatedAt: args.now,
  };
}
