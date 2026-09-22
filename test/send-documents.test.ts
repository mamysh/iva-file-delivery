import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import sendDocuments from "../plugin/sh.iva/extension/tools/send_documents.ts";

const context = {
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
} as never;

test("mixed formats upload in one document album and preserve order", async () => {
  const base = mkdtempSync(join(tmpdir(), "iva-file-delivery-album-"));
  const directory = join(base, "vault", "attachments", "outgoing");
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "report.pdf"), "pdf");
  writeFileSync(join(directory, "data.csv"), "csv");
  writeFileSync(join(directory, "image.png"), "png");

  const previousVault = process.env.ASSISTANT_VAULT_DIR;
  const previousToken = process.env.TELEGRAM_BOT_TOKEN;
  const previousFetch = globalThis.fetch;
  process.env.ASSISTANT_VAULT_DIR = join(base, "vault");
  process.env.TELEGRAM_BOT_TOKEN = "00000000:BOT_TOKEN_PLACEHOLDER";
  let requests = 0;
  globalThis.fetch = (async (input, init) => {
    requests++;
    assert.equal(
      String(input),
      "https://api.telegram.org/bot00000000:BOT_TOKEN_PLACEHOLDER/sendMediaGroup",
    );
    const form = init?.body as FormData;
    assert.equal(form.get("chat_id"), "42");
    assert.equal(form.get("message_thread_id"), "8");
    assert.deepEqual(JSON.parse(String(form.get("media"))), [
      { type: "document", media: "attach://file0" },
      { type: "document", media: "attach://file1" },
      { type: "document", media: "attach://file2" },
    ]);
    assert.deepEqual(
      ["file0", "file1", "file2"].map((key) => {
        const file = form.get(key) as File;
        return [file.name, file.type, file.size];
      }),
      [
        ["Отчёт.pdf", "application/pdf", 3],
        ["data.csv", "text/csv", 3],
        ["image.png", "image/png", 3],
      ],
    );
    return Response.json({
      ok: true,
      result: [{ message_id: 10 }, { message_id: 11 }, { message_id: 12 }],
    });
  }) as typeof fetch;

  try {
    const result = await sendDocuments.execute(
      {
        files: [
          { path: "outgoing/report.pdf", file_name: "Отчёт.pdf" },
          { path: "outgoing/data.csv" },
          { path: "outgoing/image.png" },
        ],
      },
      context,
    );
    assert.equal(requests, 1);
    assert.deepEqual(result, {
      ok: true,
      message_ids: [10, 11, 12],
      files: [
        { file_name: "Отчёт.pdf", bytes: 3, mime_type: "application/pdf" },
        { file_name: "data.csv", bytes: 3, mime_type: "text/csv" },
        { file_name: "image.png", bytes: 3, mime_type: "image/png" },
      ],
    });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousVault === undefined) delete process.env.ASSISTANT_VAULT_DIR;
    else process.env.ASSISTANT_VAULT_DIR = previousVault;
    if (previousToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = previousToken;
  }
});

test("invalid album member prevents every upload", async () => {
  const base = mkdtempSync(join(tmpdir(), "iva-file-delivery-album-safe-"));
  const directory = join(base, "vault", "attachments");
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "safe.txt"), "safe");
  const previousVault = process.env.ASSISTANT_VAULT_DIR;
  const previousToken = process.env.TELEGRAM_BOT_TOKEN;
  const previousFetch = globalThis.fetch;
  process.env.ASSISTANT_VAULT_DIR = join(base, "vault");
  process.env.TELEGRAM_BOT_TOKEN = "00000000:BOT_TOKEN_PLACEHOLDER";
  globalThis.fetch = (async () => {
    assert.fail("network request must not start");
  }) as typeof fetch;
  try {
    const result = await sendDocuments.execute(
      { files: [{ path: "safe.txt" }, { path: "missing.pdf" }] },
      context,
    );
    assert.deepEqual(result, { ok: false, error: "attachment is unavailable" });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousVault === undefined) delete process.env.ASSISTANT_VAULT_DIR;
    else process.env.ASSISTANT_VAULT_DIR = previousVault;
    if (previousToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = previousToken;
  }
});

test("album schema enforces Telegram's 2-10 item limit", () => {
  assert.equal(
    sendDocuments.inputSchema.safeParse({ files: [{ path: "one.txt" }] }).success,
    false,
  );
  assert.equal(
    sendDocuments.inputSchema.safeParse({
      files: Array.from({ length: 11 }, (_, index) => ({
        path: `file${String(index)}.txt`,
      })),
    }).success,
    false,
  );
});
