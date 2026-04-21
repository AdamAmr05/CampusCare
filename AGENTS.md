# AGENTS.md

This file defines how humans and AI agents collaborate in this repository.
If a rule here conflicts with convenience, follow the rule.

Source of truth for product scope and vision: `context.md`.
If implementation guidance here conflicts with product scope in `context.md`, follow `context.md`.

## 1) Product Context (Milestone 1)

CampusCare is a mobile facility management app for the GIU community.

Core roles:
- Reporter: submits and tracks facility issue tickets.
- Manager: reviews open tickets, assigns resolvers, and performs final closure.
- Resolver: handles assigned tickets, updates progress, and marks resolved.

Core flow:
1. Reporter creates ticket (photo, category, location, description)
2. Manager reviews open tickets and assigns a resolver
3. Resolver updates status during handling
4. Resolver marks ticket as resolved with a resolution note
5. Manager confirms completed work and closes the ticket
6. Reporter sees status/history and notifications

Scope boundary:
- Focus only on Reporter, Manager, and Resolver workflows defined in `context.md`.
- Future scope ideas (gamification, configurable deployments) are not in current implementation scope unless explicitly requested.

## 2) Non-Negotiables

- End-to-end type safety is mandatory.
- GIU email verification is required before full app access.
- Role-based access control (`Reporter`, `Manager`, `Resolver`) must be enforced on the backend.
- Convex functions are the backend API surface and must be validated strictly.
- Ticket status history is an audit trail and should be append-only.

## 3) Stack Baseline (Current)

- Mobile app: React Native (Expo) + TypeScript
- Runtime/package manager: npm (current repo baseline)
- Backend/realtime/data: Convex
- File/image storage: Convex File Storage (for ticket images)

## 4) Commands (Current)

### Install
- `npm install`

### Dev
- Start Expo: `npm run start`
- Android: `npm run android`
- iOS: `npm run ios`
- Web: `npm run web`
- Convex dev sync: `npm run convex:dev`

### Typecheck
- `npx tsc --noEmit`

### Lint
- `npm run lint`
- `npm run lint:ci`

Note:
- If scripts change later, update this section in the same PR.

## 5) Type Safety Rules (MUST)

- TypeScript strict mode is required.
- Do not use `any` unless explicitly justified in code comments and approved.
- Share domain types across frontend and backend boundaries.
- Use generated Convex types (`Id<"table">`, `Doc<"table">`) instead of raw string IDs.
- Validate external payloads at boundaries before they touch domain logic.
- Prefer discriminated unions for ticket statuses and transitions.

## 6) Convex Backend Rules (MUST-FOLLOW)

### Function registration
- Use current Convex function syntax (`query`, `mutation`, `action`, `internalQuery`, `internalMutation`, `internalAction`).
- Always include both `args` and `returns` validators.
- If function returns nothing: `returns: v.null()` and `return null`.
- Treat all public functions as Internet-exposed.

### Access enforcement
- Every query/mutation must validate identity and role server-side.
- Never trust role/org/identity values from client input.
- Reporter can only read/write their own permitted ticket data.
- Manager can only perform manager-allowed assignment and closure operations.
- Resolver can only update tickets assigned to that resolver under resolver rules.

### Data and performance
- Prefer indexed access with `.withIndex()` over broad scans/filters.
- Use pagination or bounded reads (`.take(n)`) for list screens.
- Convex values cannot be `undefined`; use `null`.
- Avoid `v.any()` for core business entities.

### Actions
- Add `"use node";` only when Node-only APIs are required.
- Do not use `ctx.db` inside actions.

## 7) Auth + Authorization Rules

- Only verified GIU email accounts can access protected functionality.
- Enforce Reporter vs Manager vs Resolver permissions in backend logic, not just UI.
- Status changes must record actor (`changed_by`) and timestamp in history.
- Resolver marking as resolved requires a resolution note.
- Manager performs final close after resolver marks resolved.

## 8) Reliability + UX Rules

- Ticket submission failures must preserve entered user data for retry.
- Mutations should be idempotent where retried by clients.
- Keep ticket reporting flow low-friction and quick (target under 1 minute).
- Prioritize clear state visibility (open, assigned, in progress, resolved [awaiting manager approval], closed).

## 9) Testing Rules

- Unit tests must not require network access.
- Integration tests should isolate external dependencies with mocks/fakes.
- Add integration coverage for critical flow: create -> assign -> update -> resolve -> close.
- Add tests for role/access boundaries and invalid status transitions.

## 10) Workflow Rules for Agents

- Before major changes, summarize plan briefly in plain language.
- Prefer small, atomic patches with clear intent.
- Keep cyclomatic complexity low: aim for 8 or less in typical functions and avoid introducing new code above 12 without a strong reason or a follow-up refactor plan.
- Do not introduce new dependencies without explicit rationale.
- If constraints conflict, ask before proceeding.

## 11) Skills (Use Proactively)

- Before substantial work, check whether relevant installed skills apply and follow them.
- For mobile work and mobile frontend work, use `vercel-react-native-skills`.
- Prioritize Convex-related skills for backend/schema/security tasks.
- If the task is big and Convex-related, also use [`convex_rules.txt`](convex_rules.txt).
- Do not reference or require skills that are not installed in this environment.
