import assert from "node:assert/strict";
import test from "node:test";
import { createMcpServer } from "../update/mcp-server.ts";

test("MCP server exposes only the three bounded updater tools", () => {
  const server = createMcpServer({
    check: async () => ({ state: "current" }),
    apply: async () => ({ state: "started" }),
    status: async () => ({ state: "never_run" }),
  });
  const registered = (server as unknown as { _registeredTools: Record<string, unknown> })
    ._registeredTools;
  assert.deepEqual(Object.keys(registered).sort(), [
    "iva_file_delivery_update_apply",
    "iva_file_delivery_update_check",
    "iva_file_delivery_update_status",
  ]);
});
