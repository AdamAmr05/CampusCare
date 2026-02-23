import { useEffect } from "react";
import { Platform } from "react-native";
import { useMutation } from "convex/react";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { api } from "../../../convex/_generated/api";
import { formatError } from "../../utils/formatError";

type PushPlatform = "ios" | "android" | "web" | "unknown";

let didConfigureNotificationHandler = false;

function getPushPlatform(): PushPlatform {
  if (Platform.OS === "ios") {
    return "ios";
  }
  if (Platform.OS === "android") {
    return "android";
  }
  if (Platform.OS === "web") {
    return "web";
  }
  return "unknown";
}

function getExpoProjectId(): string | null {
  const configuredId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

  if (typeof configuredId !== "string") {
    return null;
  }

  const normalized = configuredId.trim();
  return normalized.length > 0 ? normalized : null;
}

function configureForegroundNotificationHandler(): void {
  if (didConfigureNotificationHandler) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  didConfigureNotificationHandler = true;
}

export function usePushRegistration(enabled: boolean): void {
  const registerPushToken = useMutation(api.notifications.registerPushToken);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (Platform.OS === "web") {
      return;
    }

    if (!Device.isDevice) {
      return;
    }

    configureForegroundNotificationHandler();

    let cancelled = false;

    const registerToken = async (expoPushToken: string) => {
      if (cancelled) {
        return;
      }

      try {
        await registerPushToken({
          expoPushToken,
          platform: getPushPlatform(),
        });
      } catch (error) {
        console.warn("Failed to register Expo push token:", formatError(error));
      }
    };

    const run = async () => {
      try {
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#FFCF00",
          });
        }

        const currentPermissions = await Notifications.getPermissionsAsync();
        let permissionStatus = currentPermissions.status;

        if (permissionStatus !== "granted") {
          const requestedPermissions = await Notifications.requestPermissionsAsync();
          permissionStatus = requestedPermissions.status;
        }

        if (permissionStatus !== "granted") {
          return;
        }

        const projectId = getExpoProjectId();
        if (!projectId) {
          console.warn(
            "Missing EAS projectId. Configure expo.extra.eas.projectId or EXPO_PUBLIC_EAS_PROJECT_ID.",
          );
          return;
        }

        const tokenResponse = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        await registerToken(tokenResponse.data);
      } catch (error) {
        console.warn("Push registration failed:", formatError(error));
      }
    };

    void run();

    const tokenSubscription = Notifications.addPushTokenListener((token) => {
      void registerToken(token.data);
    });

    return () => {
      cancelled = true;
      tokenSubscription.remove();
    };
  }, [enabled, registerPushToken]);
}
