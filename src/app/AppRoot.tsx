import React, { useState } from "react";
import { useConvexAuth } from "convex/react";
import type { OnboardingIntent } from "../domain/types";
import { LoadingScreen } from "../ui/Screens";
import { AuthenticatedGate } from "../features/auth/AuthenticatedGate";
import { UnauthenticatedGate } from "../features/auth/UnauthenticatedGate";

export function AppRoot(): React.JSX.Element {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const [intent, setIntent] = useState<OnboardingIntent>("reporter");

  if (isLoading) {
    return <LoadingScreen label="Loading session..." />;
  }

  if (!isAuthenticated) {
    return <UnauthenticatedGate onIntentSelected={setIntent} />;
  }

  return <AuthenticatedGate intent={intent} onIntentChanged={setIntent} />;
}
