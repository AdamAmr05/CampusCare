import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

const PUSH_INSTALLATION_ID_STORAGE_KEY = "campuscare.pushInstallationId";

function normalizeStoredInstallationId(value: string | null): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

export async function getStoredPushInstallationId(): Promise<string | null> {
  return normalizeStoredInstallationId(
    await SecureStore.getItemAsync(PUSH_INSTALLATION_ID_STORAGE_KEY),
  );
}

export async function getOrCreatePushInstallationId(): Promise<string> {
  const existing = await getStoredPushInstallationId();
  if (existing) {
    return existing;
  }

  const installationId = Crypto.randomUUID();
  await SecureStore.setItemAsync(PUSH_INSTALLATION_ID_STORAGE_KEY, installationId, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });

  return installationId;
}
