import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";
import type { ApplyUpdateInput } from "./plugin-updater.ts";

export type PluginUpdaterPort = {
  readonly check: () => Promise<unknown>;
  readonly apply: (input: ApplyUpdateInput) => Promise<unknown>;
  readonly status: () => Promise<unknown>;
};

const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

function success(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

function failure(error: unknown) {
  const code =
    error instanceof Error && /^[A-Z][A-Z0-9_]{2,80}$/u.test(error.message)
      ? error.message
      : "INTERNAL_ERROR";
  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          ok: false,
          error: code,
          category: "internal",
          retryable: false,
          action: "inspect_plugin",
        }),
      },
    ],
  };
}

async function safe(run: () => Promise<unknown>) {
  try {
    return success(await run());
  } catch (error) {
    return failure(error);
  }
}

export function createMcpServer(updater: PluginUpdaterPort): McpServer {
  const server = new McpServer({ name: "file-delivery-updates", version: "0.3.1" });
  server.registerTool(
    "iva_file_delivery_update_check",
    {
      description:
        "Check installed and candidate iva-file-delivery semantic versions, exact Git source and GitHub Actions. This does not change the server.",
      inputSchema: z.object({}).strict(),
      annotations: readOnly,
    },
    () => safe(() => updater.check()),
  );
  server.registerTool(
    "iva_file_delivery_update_apply",
    {
      description:
        "Start the fresh iva-file-delivery update only after the owner chose Update in Iva's structured ask_question prompt in this private conversation.",
      inputSchema: z
        .object({
          candidateSha: z.string().regex(/^[a-f0-9]{40}$/u),
          approvalToken: z.string().regex(/^[A-F0-9]{24}$/u),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    (input) => safe(() => updater.apply(input)),
  );
  server.registerTool(
    "iva_file_delivery_update_status",
    {
      description:
        "Read the latest background iva-file-delivery update or rollback status, including semantic versions when available.",
      inputSchema: z.object({}).strict(),
      annotations: readOnly,
    },
    () => safe(() => updater.status()),
  );
  return server;
}
