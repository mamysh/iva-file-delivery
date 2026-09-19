import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import sendDocument from "../plugin/sh.iva/extension/tools/send_document.ts";

test("the tool uploads with the bot into the current private chat", async () => {
  const base = mkdtempSync(join(tmpdir(), "iva-file-delivery-tool-"));
  const attachmentDir = join(base, "vault", "attachments", "outgoing");
  mkdirSync(attachmentDir, { recursive: true });
  writeFileSync(join(attachmentDir, "report.docx"), "document bytes");

  const previousVault = process.env.ASSISTANT_VAULT_DIR;
  const previousToken = process.env.TELEGRAM_BOT_TOKEN;
  const previousFetch = globalThis.fetch;
  process.env.ASSISTANT_VAULT_DIR = join(base, "vault");
  process.env.TELEGRAM_BOT_TOKEN = "00000000:BOT_TOKEN_PLACEHOLDER";

  let request:
    | { readonly url: string; readonly form: Readonly<Record<string, string>> }
    | undefined;
  globalThis.fetch = (async (input, init) => {
    const form = init?.body as FormData;
    const entries: Record<string, string> = {};
    for (const [key, value] of form.entries())
      entries[key] =
        typeof value === "string"
          ? value
          : `${value.name}:${String(value.size)}:${value.type}`;
    request = { url: String(input), form: entries };
    return Response.json({ ok: true, result: { message_id: 99 } });
  }) as typeof fetch;

  try {
    const result = await sendDocument.execute(
      { path: "outgoing/report.docx", file_name: "Итог.docx" },
      {
        abortSignal: new AbortController().signal,
        session: {
          auth: {
            current: {
              principalType: "user",
              attributes: {
                chat_id: "42",
                user_id: "42",
                chat_type: "private",
                message_thread_id: "8",
              },
            },
          },
        },
      } as never,
    );

    assert.deepEqual(result, {
      ok: true,
      message_id: 99,
      file_name: "Итог.docx",
      bytes: 14,
      mime_type:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    assert.equal(
      request?.url,
      "https://api.telegram.org/bot00000000:BOT_TOKEN_PLACEHOLDER/sendDocument",
    );
    assert.deepEqual(request?.form, {
      chat_id: "42",
      message_thread_id: "8",
      document:
        "Итог.docx:14:application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousVault === undefined) delete process.env.ASSISTANT_VAULT_DIR;
    else process.env.ASSISTANT_VAULT_DIR = previousVault;
    if (previousToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = previousToken;
  }
});

test("unexpected transport details are not returned to the model", async () => {
  const base = mkdtempSync(join(tmpdir(), "iva-file-delivery-safe-error-"));
  const attachmentDir = join(base, "vault", "attachments");
  mkdirSync(attachmentDir, { recursive: true });
  writeFileSync(join(attachmentDir, "safe.txt"), "safe");

  const previousVault = process.env.ASSISTANT_VAULT_DIR;
  const previousToken = process.env.TELEGRAM_BOT_TOKEN;
  const previousFetch = globalThis.fetch;
  process.env.ASSISTANT_VAULT_DIR = join(base, "vault");
  process.env.TELEGRAM_BOT_TOKEN = "00000000:BOT_TOKEN_PLACEHOLDER";
  globalThis.fetch = (async () => {
    throw new Error(`network failure at ${base}/private`);
  }) as typeof fetch;

  try {
    const result = await sendDocument.execute(
      { path: "safe.txt" },
      {
        abortSignal: new AbortController().signal,
        session: {
          auth: {
            current: {
              principalType: "user",
              attributes: {
                chat_id: "42",
                user_id: "42",
                chat_type: "private",
              },
            },
          },
        },
      } as never,
    );
    assert.deepEqual(result, { ok: false, error: "file delivery failed" });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousVault === undefined) delete process.env.ASSISTANT_VAULT_DIR;
    else process.env.ASSISTANT_VAULT_DIR = previousVault;
    if (previousToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = previousToken;
  }
});
