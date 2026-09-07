import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GmailService } from "../services/gmail.service.js";
import { GoogleDocsService } from "../services/google-docs.service.js";
import { GmailCreateDraftSchema } from "../tools/gmail/schemas.js";
import { GmailSendEmailSchema } from "../tools/gmail/schemas.js";
import { GoogleDocsAppendSchema } from "../tools/google-docs/schemas.js";
import { createGmailCreateDraftHandler } from "../tools/gmail/create-draft.tool.js";
import { createGmailSendEmailHandler } from "../tools/gmail/send-email.tool.js";
import { createGoogleDocsAppendHandler } from "../tools/google-docs/append-content.tool.js";
import { logger } from "../logging/logger.js";

/**
 * Registers all MCP tools with the server.
 *
 * To add a new tool:
 * 1. Create a schema in src/tools/<provider>/schemas.ts
 * 2. Create a service method in src/services/<provider>.service.ts
 * 3. Create a handler in src/tools/<provider>/<tool>.tool.ts
 * 4. Register it here with server.tool(...)
 *
 * The MCP SDK handles JSON schema generation from the Zod schemas automatically.
 */
export function registerTools(
  server: McpServer,
  gmailService: GmailService,
  docsService: GoogleDocsService
): void {
  // ─── Gmail: Create Draft ────────────────────────────────────────────────────
  server.tool(
    "gmail_create_draft",
    [
      "Create a Gmail draft using the authenticated Google account.",
      "The email is saved as a draft and is NOT sent.",
      "Use this tool when the user wants to prepare or write an email without sending it.",
    ].join(" "),
    GmailCreateDraftSchema.shape,
    createGmailCreateDraftHandler(gmailService)
  );

  logger.debug({ tool: "gmail_create_draft" }, "Tool registered");

  // ─── Gmail: Send Email ──────────────────────────────────────────────────────
  server.tool(
    "gmail_send_email",
    [
      "Send an email immediately using the authenticated Gmail account.",
      "WARNING: This performs an external side effect — the email is delivered immediately.",
      "Use gmail_create_draft instead if the user only wants to prepare an email without sending.",
    ].join(" "),
    GmailSendEmailSchema.shape,
    createGmailSendEmailHandler(gmailService)
  );

  logger.debug({ tool: "gmail_send_email" }, "Tool registered");

  // ─── Google Docs: Append Content ────────────────────────────────────────────
  server.tool(
    "google_docs_append",
    [
      "Append text content to the end of an existing Google Doc.",
      "Existing document content is preserved — only new content is added.",
      "Requires the Google Docs document ID (found in the document URL).",
    ].join(" "),
    GoogleDocsAppendSchema.shape,
    createGoogleDocsAppendHandler(docsService)
  );

  logger.debug({ tool: "google_docs_append" }, "Tool registered");

  logger.info({ tool_count: 3 }, "All MCP tools registered");
}
