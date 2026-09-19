import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  attachmentsRootFromEnv,
  loadAttachment,
  privateTelegramTarget,
} from "../lib/file-policy.ts";

const UPLOAD_TIMEOUT_MS = 180_000;

type TelegramResponse = {
  readonly ok?: boolean;
  readonly result?: { readonly message_id?: number };
};

export default defineTool({
  description:
    "Send a local file from vault/attachments to the owner's current private Telegram chat as the Iva bot.",
  inputSchema: z.object({
    path: z
      .string()
      .min(1)
      .describe(
        "Path relative to vault/attachments; absolute paths and paths outside that directory are rejected",
      ),
    file_name: z
      .string()
      .min(1)
      .max(255)
      .optional()
      .describe("Optional plain filename shown in Telegram"),
  }),
  async execute(input, ctx) {
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    if (!token) return { ok: false as const, error: "Telegram bot is not configured" };

    try {
      const target = privateTelegramTarget(ctx.session.auth.current);
      const attachment = loadAttachment(
        input.path,
        attachmentsRootFromEnv(),
        input.file_name,
      );

      const form = new FormData();
      form.append("chat_id", target.chatId);
      if (target.threadId !== null)
        form.append("message_thread_id", target.threadId);
      // Copy into an owned ArrayBuffer. Node's Buffer type may be backed by an
      // ArrayBufferLike (including SharedArrayBuffer), while Blob deliberately
      // accepts only transferable ArrayBuffer data.
      const payload = new Uint8Array(attachment.bytes.length);
      payload.set(attachment.bytes);
      form.append(
        "document",
        new Blob([payload.buffer], { type: attachment.mimeType }),
        attachment.fileName,
      );

      const response = await fetch(
        `https://api.telegram.org/bot${token}/sendDocument`,
        {
          method: "POST",
          body: form,
          signal: AbortSignal.any([
            ctx.abortSignal,
            AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
          ]),
        },
      );
      const body = (await response.json().catch(() => null)) as
        | TelegramResponse
        | null;
      if (body?.ok !== true)
        return {
          ok: false as const,
          error: `Telegram rejected the upload with HTTP ${String(response.status)}`,
        };

      return {
        ok: true as const,
        message_id: body.result?.message_id ?? null,
        file_name: attachment.fileName,
        bytes: attachment.bytes.length,
        mime_type: attachment.mimeType,
      };
    } catch (error) {
      const safeErrors = new Set([
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
      const message = error instanceof Error ? error.message : "";
      return {
        ok: false as const,
        error:
          safeErrors.has(message) || /^file exceeds [0-9]+ byte upload limit$/u.test(message)
            ? message
            : "file delivery failed",
      };
    }
  },
});
