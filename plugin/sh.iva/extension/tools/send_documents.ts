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
  readonly result?: readonly { readonly message_id?: number }[];
};

export default defineTool({
  description:
    "Send 2-10 local files of any formats from vault/attachments as one Telegram document album to the owner's current private chat. Use automatically when a task produces multiple files.",
  inputSchema: z.object({
    files: z
      .array(
        z.object({
          path: z
            .string()
            .min(1)
            .describe("Path relative to vault/attachments"),
          file_name: z
            .string()
            .min(1)
            .max(255)
            .optional()
            .describe("Optional plain filename shown in Telegram"),
        }),
      )
      .min(2)
      .max(10)
      .describe("All files to send together, in display order"),
  }),
  async execute(input, ctx) {
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    if (!token) return { ok: false as const, error: "Telegram bot is not configured" };

    try {
      const target = privateTelegramTarget(ctx.session.auth.current);
      const root = attachmentsRootFromEnv();
      // Validate and read the entire album before making any network request.
      const attachments = input.files.map((file) =>
        loadAttachment(file.path, root, file.file_name),
      );

      const form = new FormData();
      form.append("chat_id", target.chatId);
      if (target.threadId !== null)
        form.append("message_thread_id", target.threadId);
      form.append(
        "media",
        JSON.stringify(
          attachments.map((_, index) => ({
            type: "document",
            media: `attach://file${String(index)}`,
          })),
        ),
      );
      for (const [index, attachment] of attachments.entries()) {
        const payload = new Uint8Array(attachment.bytes.length);
        payload.set(attachment.bytes);
        form.append(
          `file${String(index)}`,
          new Blob([payload.buffer], { type: attachment.mimeType }),
          attachment.fileName,
        );
      }

      const response = await fetch(
        `https://api.telegram.org/bot${token}/sendMediaGroup`,
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
      if (body?.ok !== true || body.result?.length !== attachments.length)
        return {
          ok: false as const,
          error: `Telegram rejected the album with HTTP ${String(response.status)}`,
        };

      return {
        ok: true as const,
        message_ids: body.result.map((message) => message.message_id ?? null),
        files: attachments.map((attachment) => ({
          file_name: attachment.fileName,
          bytes: attachment.bytes.length,
          mime_type: attachment.mimeType,
        })),
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
          safeErrors.has(message) || /^file exceeds the [0-9]+ byte upload limit$/u.test(message)
            ? message
            : "file delivery failed",
      };
    }
  },
});
