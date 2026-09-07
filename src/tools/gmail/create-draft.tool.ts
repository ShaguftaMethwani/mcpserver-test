import { GmailService } from "../../services/gmail.service.js";
import { GmailCreateDraftSchema, GmailCreateDraftInput } from "./schemas.js";
import { toMcpContent, McpToolResponse } from "../../types/mcp.types.js";
import { handleGoogleApiError } from "../../errors/error-handler.js";
import { logger } from "../../logging/logger.js";

/**
 * MCP tool handler for `gmail_create_draft`.
 *
 * This is a thin adapter between the MCP SDK and GmailService.
 * All business logic lives in the service layer.
 */
export function createGmailCreateDraftHandler(gmailService: GmailService) {
  return async function handleGmailCreateDraft(
    args: GmailCreateDraftInput
  ): Promise<ReturnType<typeof toMcpContent>> {
    logger.info(
      { tool_name: "gmail_create_draft", to_count: args.to.length },
      "Tool invoked: gmail_create_draft"
    );

    try {
      const result = await gmailService.createDraft(args);
      return toMcpContent(result);
    } catch (error) {
      const errorResp = handleGoogleApiError(error, {
        tool_name: "gmail_create_draft",
        operation: "createDraft",
      });
      return toMcpContent(errorResp);
    }
  };
}
