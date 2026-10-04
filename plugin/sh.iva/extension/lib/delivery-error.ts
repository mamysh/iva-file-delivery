const SAFE_ERRORS = new Set([
  "file delivery requires an authenticated user turn",
  "file delivery is allowed only in the owner's current private Telegram chat",
  "ASSISTANT_VAULT_DIR must be an absolute path before files can be delivered",
  "path must be relative to vault/attachments",
  "attachment is unavailable",
  "refusing to send a file outside vault/attachments",
  "refusing to send a hidden file or dot-path",
  "attachment is not a regular file",
  "refusing to send an empty file",
  "file_name must be a plain visible filename",
]);

export function deliveryError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  return SAFE_ERRORS.has(message) || /^file exceeds the [0-9]+ byte upload limit$/u.test(message)
    ? message
    : "file delivery failed";
}
