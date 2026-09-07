/**
 * MCP Google Server — Entry Point
 *
 * Boots the MCP server and connects it to the stdio transport.
 * All MCP communication happens over stdin/stdout.
 * Logs are written to stderr to avoid interfering with the MCP protocol.
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getConfig } from "./config/config.js";
import { createMcpServer } from "./server/mcp-server.js";
import { logger } from "./logging/logger.js";

async function main(): Promise<void> {
  // Load and validate configuration first — fail fast if misconfigured
  let config;
  try {
    config = getConfig();
  } catch (err) {
    // Config errors go to stderr, not stdout (which is reserved for MCP protocol)
    process.stderr.write(
      `\n❌ Configuration error: ${err instanceof Error ? err.message : String(err)}\n\n`
    );
    process.exit(1);
  }

  logger.info("Starting MCP Google Server...");

  const server = createMcpServer(config);
  const transport = new StdioServerTransport();

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    logger.info("Received SIGINT, shutting down gracefully...");
    await server.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    logger.info("Received SIGTERM, shutting down gracefully...");
    await server.close();
    process.exit(0);
  });

  // Connect transport — this blocks until the client disconnects
  await server.connect(transport);
  logger.info("MCP server connected and ready.");
}

main().catch((err) => {
  process.stderr.write(
    `\n❌ Fatal error: ${err instanceof Error ? err.message : String(err)}\n`
  );
  process.exit(1);
});
