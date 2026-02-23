/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_env from "../lib/env.js";
import type * as lib_notifications from "../lib/notifications.js";
import type * as lib_ticketValidators from "../lib/ticketValidators.js";
import type * as lib_tickets from "../lib/tickets.js";
import type * as lib_validators from "../lib/validators.js";
import type * as notifications from "../notifications.js";
import type * as resolverRequests from "../resolverRequests.js";
import type * as ticketsManager from "../ticketsManager.js";
import type * as ticketsReporter from "../ticketsReporter.js";
import type * as ticketsResolver from "../ticketsResolver.js";
import type * as ticketsShared from "../ticketsShared.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  "lib/auth": typeof lib_auth;
  "lib/env": typeof lib_env;
  "lib/notifications": typeof lib_notifications;
  "lib/ticketValidators": typeof lib_ticketValidators;
  "lib/tickets": typeof lib_tickets;
  "lib/validators": typeof lib_validators;
  notifications: typeof notifications;
  resolverRequests: typeof resolverRequests;
  ticketsManager: typeof ticketsManager;
  ticketsReporter: typeof ticketsReporter;
  ticketsResolver: typeof ticketsResolver;
  ticketsShared: typeof ticketsShared;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
