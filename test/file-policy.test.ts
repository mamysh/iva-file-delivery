import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import {
  attachmentsRootFromEnv,
  loadAttachment,
  privateTelegramTarget,
  safeFileName,
} from "../plugin/sh.iva/extension/lib/file-policy.ts";

test("a private Telegram owner turn resolves only its current chat", () => {
  assert.deepEqual(
    privateTelegramTarget({
      principalType: "user",
      attributes: {
        chat_id: "42",
        user_id: "42",
        chat_type: "private",
        message_thread_id: "7",
      },
    }),
    { chatId: "42", threadId: "7" },
  );
});

test("groups and mismatched private identities are rejected", () => {
  for (const attributes of [
    { chat_id: "-100", user_id: "42", chat_type: "supergroup" },
    { chat_id: "41", user_id: "42", chat_type: "private" },
  ]) {
    assert.throws(
      () => privateTelegramTarget({ principalType: "user", attributes }),
      /current private Telegram chat/u,
    );
  }
});

test("the attachments root must come from an absolute vault path", () => {
  assert.equal(
    attachmentsRootFromEnv({ ASSISTANT_VAULT_DIR: "/srv/vault" }),
    "/srv/vault/attachments",
  );
  assert.throws(
    () => attachmentsRootFromEnv({ ASSISTANT_VAULT_DIR: "vault" }),
    /absolute path/u,
  );
});

test("only regular visible files inside attachments can be loaded", () => {
  const base = mkdtempSync(join(tmpdir(), "iva-file-delivery-"));
  const root = join(base, "vault", "attachments");
  const outside = join(base, "outside.txt");
  mkdirSync(join(root, "2026-09-19", "outgoing"), { recursive: true });
  writeFileSync(outside, "secret");
  writeFileSync(join(root, "2026-09-19", "outgoing", "report.pdf"), "pdf");
  writeFileSync(join(root, "2026-09-19", ".secret"), "hidden");
  writeFileSync(join(root, "empty.txt"), "");
  symlinkSync(outside, join(root, "escape.txt"));

  const loaded = loadAttachment(
    "2026-09-19/outgoing/report.pdf",
    root,
    "Отчёт.pdf",
  );
  assert.equal(Buffer.from(loaded.bytes).toString(), "pdf");
  assert.equal(loaded.fileName, "Отчёт.pdf");
  assert.equal(loaded.mimeType, "application/pdf");

  assert.throws(() => loadAttachment(outside, root), /relative/u);
  assert.throws(() => loadAttachment(resolve(root, "empty.txt"), root), /relative/u);
  assert.throws(() => loadAttachment("escape.txt", root), /outside/u);
  assert.throws(
    () => loadAttachment("2026-09-19/.secret", root),
    /hidden/u,
  );
  assert.throws(() => loadAttachment("empty.txt", root), /empty/u);
  assert.throws(
    () => loadAttachment("2026-09-19/outgoing/report.pdf", root, undefined, 2),
    /upload limit/u,
  );
});

test("filesystem errors do not disclose absolute paths", () => {
  const base = mkdtempSync(join(tmpdir(), "iva-file-delivery-errors-"));
  const root = join(base, "vault", "attachments");
  mkdirSync(root, { recursive: true });

  assert.throws(
    () => loadAttachment("missing/private-name.txt", root),
    (error: unknown) =>
      error instanceof Error &&
      error.message === "attachment is unavailable" &&
      !error.message.includes(base),
  );
});

test("Telegram filenames cannot contain paths, controls, or dot names", () => {
  assert.equal(safeFileName("Отчёт 2026.xlsx"), "Отчёт 2026.xlsx");
  for (const value of ["../x.txt", "folder/x.txt", ".env", "bad\nname.txt"]) {
    assert.throws(() => safeFileName(value), /plain visible filename/u);
  }
});
