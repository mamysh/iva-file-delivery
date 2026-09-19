import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./mcp-server.ts";
import { PluginUpdater } from "./plugin-updater.ts";

const server = createMcpServer(new PluginUpdater());
await server.connect(new StdioServerTransport());
