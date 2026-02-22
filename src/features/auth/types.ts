import type { Id } from "../../../convex/_generated/dataModel";
import type {
  AccountStatus,
  ResolverRequestStatus,
  UserRole,
} from "../../domain/types";

export type AccessSummary = {
  userId: Id<"users">;
  email: string;
  fullName: string;
  role: UserRole;
  accountStatus: AccountStatus;
  latestResolverRequestId: Id<"resolver_requests"> | null;
  latestResolverRequestStatus: ResolverRequestStatus | null;
  latestResolverDecisionNote: string | null;
};

export type ResolverRequest = {
  _id: Id<"resolver_requests">;
  requesterEmail: string;
  requesterName: string;
  reason: string | null;
  submittedAt: number;
};
