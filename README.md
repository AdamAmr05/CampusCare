# CampusCare Mobile

CampusCare is an Expo React Native app with a Convex backend for GIU facility issue reporting. Reporters submit tickets with images, managers assign and close work, and resolvers update assigned tickets through the repair lifecycle.

## Deliverables

- API documentation: [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)
- Database schema: [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md)
- Product context and SRS source notes: [context.md](context.md)
- Convex backend: [convex/](convex/)
- Mobile app source: [src/](src/)

## Tech Stack

- Mobile: Expo, React Native, TypeScript
- Backend and realtime data: Convex
- Authentication: Clerk for Expo with Convex JWT auth
- File storage: Convex File Storage
- Push notifications: Expo Notifications with `@convex-dev/expo-push-notifications`
- Package manager: npm

## Prerequisites

- Node.js 20 or newer
- npm
- Expo development environment for the target platform
- Convex account and project
- Clerk application with email verification enabled
- For iOS or Android push testing, a physical device and EAS credentials

## Environment Setup

Create a local environment file:

```bash
cp .env.example .env
```

Required variables:

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key used by the Expo app. |
| `EXPO_PUBLIC_CONVEX_URL` | Convex deployment URL used by the client. |
| `CLERK_JWT_ISSUER_DOMAIN` | Clerk issuer domain used by Convex auth config. |
| `MANAGER_EMAIL_ALLOWLIST` | Comma-separated lowercase GIU manager emails. |
| `EXPO_PUBLIC_EAS_PROJECT_ID` | EAS project id used for Expo push registration. |

Only verified emails under `giu-uni.de` or its subdomains can access protected app workflows. Manager access is provisioned from `MANAGER_EMAIL_ALLOWLIST`; managers are not created through normal app onboarding.

## Clerk Setup

1. Create a Clerk application.
2. Enable email verification.
3. Create a JWT template using the Convex preset.
4. Keep the JWT template name as `convex`.
5. Copy the Clerk issuer/frontend API URL into `CLERK_JWT_ISSUER_DOMAIN`.
6. Put the Clerk publishable key in `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`.

## Convex Setup

Install dependencies first:

```bash
npm install
```

Start Convex development sync:

```bash
npm run convex:dev
```

During first setup, follow the Convex CLI prompts to create or connect the project. After Convex prints the deployment URL, copy it into `EXPO_PUBLIC_CONVEX_URL`.

Set backend environment variables in Convex if needed:

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN "https://your-clerk-issuer.example"
npx convex env set MANAGER_EMAIL_ALLOWLIST "manager1@giu-uni.de,manager2@giu-uni.de"
```

Deploy backend functions when preparing a shared build:

```bash
npm run convex:deploy
```

## Run the App

Start Expo:

```bash
npm run start
```

Platform shortcuts:

```bash
npm run android
npm run ios
npm run ios:native
npm run web
```

For push notifications, use a physical device and a development build. Configure credentials through EAS:

```bash
eas credentials -p ios
eas credentials -p android
```

## Quality Checks

Run TypeScript validation:

```bash
npm run typecheck
```

Run linting:

```bash
npm run lint
npm run lint:ci
```

Run backend tests:

```bash
npx vitest run tests/tickets.backend.test.ts
```

Run all tests:

```bash
npx vitest run
```

## Core Workflows

Reporter:

1. Sign in with a verified GIU email.
2. Upload a ticket image.
3. Submit category, location, and description.
4. Track status and notifications.

Manager:

1. Sign in with an allowlisted manager email.
2. Review open unassigned tickets.
3. Assign active resolvers.
4. Review resolved tickets.
5. Close tickets after final confirmation.

Resolver:

1. Sign in with a verified GIU email.
2. Request resolver access if not yet approved.
3. View assigned tickets.
4. Mark work in progress.
5. Resolve with a required resolution note.

## Important Backend Rules

- Convex functions are the backend API surface.
- Public functions validate args and return values.
- Role access is enforced server-side.
- Ticket status history is append-only.
- Ticket images are stored in Convex File Storage.
- Resolver resolution notes are required before manager closure.

