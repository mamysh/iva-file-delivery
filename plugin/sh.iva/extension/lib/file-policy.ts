import {
  closeSync,
  constants,
  fstatSync,
  openSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import {
  basename,
  extname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path";

export const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024;

const MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  ".csv": "text/csv",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".json": "application/json",
  ".m4a": "audio/mp4",
  ".md": "text/markdown",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".ogg": "audio/ogg",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".txt": "text/plain",
  ".webm": "video/webm",
  ".webp": "image/webp",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".zip": "application/zip",
};

export type TelegramAuthContext = {
  readonly principalType?: string;
  readonly attributes?: Readonly<
    Record<string, string | readonly string[] | undefined>
  >;
} | null;

export type TelegramTarget = {
  readonly chatId: string;
  readonly threadId: string | null;
};

export type LoadedAttachment = {
  readonly bytes: Uint8Array;
  readonly fileName: string;
  readonly mimeType: string;
};

function scalar(
  value: string | readonly string[] | undefined,
): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function privateTelegramTarget(
  auth: TelegramAuthContext,
): TelegramTarget {
  if (auth?.principalType !== "user")
    throw new Error("file delivery requires an authenticated user turn");

  const chatId = scalar(auth.attributes?.chat_id);
  const userId = scalar(auth.attributes?.user_id);
  const chatType = scalar(auth.attributes?.chat_type);
  if (chatType !== "private" || chatId === undefined || chatId !== userId)
    throw new Error(
      "file delivery is allowed only in the owner's current private Telegram chat",
    );

  return {
    chatId,
    threadId: scalar(auth.attributes?.message_thread_id) ?? null,
  };
}

export function attachmentsRootFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const vault = env.ASSISTANT_VAULT_DIR?.trim();
  if (!vault || !isAbsolute(vault))
    throw new Error(
      "ASSISTANT_VAULT_DIR must be an absolute path before files can be delivered",
    );
  return resolve(vault, "attachments");
}

export function safeFileName(candidate: string): string {
  const value = candidate.normalize("NFC");
  if (
    value.length === 0 ||
    value.length > 255 ||
    value === "." ||
    value === ".." ||
    value.startsWith(".") ||
    basename(value) !== value ||
    /[\u0000-\u001f\u007f]/u.test(value)
  )
    throw new Error("file_name must be a plain visible filename");
  return value;
}

function inside(root: string, target: string): boolean {
  return target === root || target.startsWith(`${root}${sep}`);
}

export function loadAttachment(
  reference: string,
  rootReference: string,
  requestedName?: string,
  maxBytes = MAX_DOCUMENT_BYTES,
): LoadedAttachment {
  if (isAbsolute(reference))
    throw new Error("path must be relative to vault/attachments");

  let root: string;
  let physical: string;
  try {
    root = realpathSync(rootReference);
    physical = realpathSync(resolve(root, reference));
  } catch {
    throw new Error("attachment is unavailable");
  }
  if (!inside(root, physical))
    throw new Error("refusing to send a file outside vault/attachments");

  const segments = relative(root, physical).split(sep);
  if (segments.some((segment) => segment.startsWith(".")))
    throw new Error("refusing to send a hidden file or dot-path");

  let descriptor: number;
  try {
    descriptor = openSync(
      physical,
      constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0),
    );
  } catch {
    throw new Error("attachment is unavailable");
  }
  try {
    const stat = fstatSync(descriptor);
    if (!stat.isFile()) throw new Error("attachment is not a regular file");
    if (stat.size === 0) throw new Error("refusing to send an empty file");
    if (stat.size > maxBytes)
      throw new Error(`file exceeds the ${String(maxBytes)} byte upload limit`);

    const bytes = readFileSync(descriptor);
    if (bytes.length === 0) throw new Error("refusing to send an empty file");
    if (bytes.length > maxBytes)
      throw new Error(`file exceeds the ${String(maxBytes)} byte upload limit`);

    const fileName = safeFileName(requestedName ?? basename(physical));
    return {
      bytes,
      fileName,
      mimeType:
        MIME_BY_EXTENSION[extname(fileName).toLowerCase()] ??
        "application/octet-stream",
    };
  } finally {
    closeSync(descriptor);
  }
}
