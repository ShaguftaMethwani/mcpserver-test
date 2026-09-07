import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AppConfig } from "../config/config.js";
import { GoogleAuthService } from "../services/google-auth.service.js";
import { GmailService } from "../services/gmail.service.js";
import { GoogleDocsService } from "../services/google-docs.service.js";
import { registerTools } from "./tool-registry.js";
import { logger } from "../logging/logger.js";

/**
 * Creates and configures the MCP server instance with all tools registered.
 *
 * Services are constructed here with dependency injection,
 * so they can be swapped with test doubles in integration tests.
 */
export function createMcpServer(config: AppConfig): McpServer {
  const server = new McpServer({
    name: config.server.name,
    version: config.server.version,
  });

  logger.info(
    { server_name: config.server.name, server_version: config.server.version },
    "Initializing MCP server"
  );

  // Construct services with dependency injection
  const authService = new GoogleAuthService(config);
  const gmailService = new GmailService(authService);
  const docsService = new GoogleDocsService(authService);

  // Register all tools
  registerTools(server, gmailService, docsService);

  return server;
}
