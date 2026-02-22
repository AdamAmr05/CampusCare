import React, { useMemo } from "react";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppRoot } from "./src/app/AppRoot";
import { ErrorScreen } from "./src/ui/Screens";

const MISSING_ENV_MESSAGE = [
  "Missing required environment variables:",
  "- EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "- EXPO_PUBLIC_CONVEX_URL",
].join("\n");

export default function App(): React.JSX.Element {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
  const convex = useMemo(
    () => (convexUrl ? new ConvexReactClient(convexUrl) : null),
    [convexUrl],
  );

  if (!publishableKey || !convex) {
    return <ErrorScreen title="Configuration Required" message={MISSING_ENV_MESSAGE} />;
  }

  return (
    <SafeAreaProvider>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <AppRoot />
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </SafeAreaProvider>
  );
}
