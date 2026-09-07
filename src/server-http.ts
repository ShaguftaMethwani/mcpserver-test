/**
 * MCP Google Server — HTTP Entry Point (Railway / Cloud)
 *
 * This is the cloud-compatible alternative to src/index.ts.
 * Instead of stdio transport (which only works locally as a subprocess),
 * this file exposes the MCP server over Streamable HTTP — the current
 * MCP spec standard for hosted, remote servers.
 *
 * Transport:  StreamableHTTPServerTransport  (POST /mcp)
 * Health:     GET /health  (used by Railway's healthcheck)
 * Port:       process.env.PORT  (injected by Railway at runtime)
 */
import "dotenv/config";
import express, { Request, Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { getConfig } from "./config/config.js";
import { createMcpServer } from "./server/mcp-server.js";
import { logger } from "./logging/logger.js";

async function main(): Promise<void> {
  // Load and validate configuration — fail fast if misconfigured
  let config;
  try {
    config = getConfig();
  } catch (err) {
    process.stderr.write(
      `\n❌ Configuration error: ${err instanceof Error ? err.message : String(err)}\n\n`
    );
    process.exit(1);
  }

  const app = express();
  app.use(express.json());

  // ── MCP endpoint ─────────────────────────────────────────────────────────────
  // Clients send JSON-RPC requests via POST and optionally open an SSE stream via GET.
  // StreamableHTTPServerTransport handles both in a single handler.
  app.post("/mcp", async (req: Request, res: Response) => {
    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless — no session persistence needed
      });

      // Create a new server instance for each stateless HTTP request
      // because an MCP server can only connect to a transport once.
      const mcpServer = createMcpServer(config);

      await mcpServer.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      logger.error({ error: String(err) }, "Error handling MCP request");
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  // ── Health check ──────────────────────────────────────────────────────────────
  // Used by Railway's healthcheckPath to confirm the service is up.
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", server: config.server.name, version: config.server.version });
  });

  // ── Start listening ───────────────────────────────────────────────────────────
  const PORT = process.env.PORT ?? 3000;
  app.listen(PORT, () => {
    logger.info(`MCP HTTP server listening on port ${PORT}`);
    logger.info(`MCP endpoint: POST http://localhost:${PORT}/mcp`);
    logger.info(`Health check: GET  http://localhost:${PORT}/health`);
  });

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    logger.info("Received SIGTERM, shutting down gracefully...");
    process.exit(0);
  });
}

main().catch((err) => {
  process.stderr.write(
    `\n❌ Fatal error: ${err instanceof Error ? err.message : String(err)}\n`
  );
  process.exit(1);
});
