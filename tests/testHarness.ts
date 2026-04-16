import { convexTest } from "convex-test";
import pushNotificationsSchema from "../node_modules/@convex-dev/expo-push-notifications/dist/component/schema.js";
import schema from "../convex/schema";

const convexModules = (
  import.meta as ImportMeta & {
    glob: (pattern: string) => Record<string, () => Promise<unknown>>;
  }
).glob("../convex/**/*.*s");

const pushNotificationComponentModules = (
  import.meta as ImportMeta & {
    glob: (pattern: string) => Record<string, () => Promise<unknown>>;
  }
).glob("../node_modules/@convex-dev/expo-push-notifications/dist/component/**/*.*s");

export function createHarness() {
  process.env.MANAGER_EMAIL_ALLOWLIST = "manager@giu-uni.de";

  const t = convexTest(schema, convexModules);
  t.registerComponent(
    "pushNotifications",
    pushNotificationsSchema,
    pushNotificationComponentModules,
  );

  return t;
}
