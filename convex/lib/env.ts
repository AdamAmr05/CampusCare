export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getManagerAllowlist(): Set<string> {
  const raw: string =
    typeof process.env.MANAGER_EMAIL_ALLOWLIST === "string"
      ? process.env.MANAGER_EMAIL_ALLOWLIST
      : "";
  const values = raw
    .split(",")
    .map((value) => normalizeEmail(value))
    .filter((value) => value.length > 0);

  return new Set(values);
}

export function isExpoPushEnabled(): boolean {
  return process.env.EXPO_PUSH_ENABLED === "true";
}

export function getExpoPushAccessTokenOrNull(): string | null {
  const value =
    typeof process.env.EXPO_PUSH_ACCESS_TOKEN === "string"
      ? process.env.EXPO_PUSH_ACCESS_TOKEN.trim()
      : "";
  return value.length > 0 ? value : null;
}
