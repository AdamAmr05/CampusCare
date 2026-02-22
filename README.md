# CampusCare Mobile (Expo + Convex + Clerk)

This repository now includes:
- Clerk authentication for Expo
- Convex backend auth enforcement and role onboarding
- Resolver request + manager approval workflow

## Prerequisites

- Node.js 20+
- npm
- Convex project initialized (`npx convex dev`)
- Clerk application with a JWT template named `convex`

## Environment variables

Create a local `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Required variables:
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_CONVEX_URL`
- `CLERK_JWT_ISSUER_DOMAIN`
- `MANAGER_EMAIL_ALLOWLIST` (comma-separated lowercase emails)

## Clerk setup notes

1. In Clerk Dashboard, create a JWT template using the Convex preset.
2. Keep the template/application ID as `convex`.
3. Copy Clerk Frontend API URL to `CLERK_JWT_ISSUER_DOMAIN`.
4. Use Expo auth with email verification code flow.

## Install and run

```bash
npm install
npm run convex:dev
npm run start
```

Platform shortcuts:
- Android: `npm run android`
- iOS: `npm run ios`
- Web: `npm run web`

## Typecheck

```bash
npm run typecheck
```

## Auth and role behavior

- Only verified emails ending with `@giu-uni.de` can access protected backend features.
- Manager role is controlled by `MANAGER_EMAIL_ALLOWLIST` in Convex env vars.
- Reporter is default onboarding intent.
- Resolver onboarding is requested via a separate sign-in path and requires manager approval.
- Pending/rejected resolver-request users are blocked from protected app features.

## Convex functions added

- `auth.upsertCurrentUser`
- `auth.getMyAccess`
- `resolverRequests.create`
- `resolverRequests.getMineLatest`
- `resolverRequests.reapply`
- `resolverRequests.listPending`
- `resolverRequests.approve`
- `resolverRequests.reject`
