export function formatError(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "errors" in error) {
    const possibleErrors = (error as { errors?: Array<{ message?: string }> }).errors;
    if (possibleErrors && possibleErrors.length > 0) {
      const firstMessage = possibleErrors[0]?.message;
      if (firstMessage) {
        return firstMessage;
      }
    }
  }

  return "An unexpected error occurred.";
}
