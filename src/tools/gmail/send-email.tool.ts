import { GmailService } from "../../services/gmail.service.js";
import { GmailSendEmailSchema, GmailSendEmailInput } from "./schemas.js";
import { toMcpContent } from "../../types/mcp.types.js";
import { handleGoogleApiError } from "../../errors/error-handler.js";
import { logger } from "../../logging/logger.js";

/**
 * MCP tool handler for `gmail_send_email`.
 *
 * NOTE: This tool causes an external side effect — the email is sent immediately.
 * The tool description registered in tool-registry.ts makes this explicit.
 */
export function createGmailSendEmailHandler(gmailService: GmailService) {
  return async function handleGmailSendEmail(
    args: GmailSendEmailInput
  ): Promise<ReturnType<typeof toMcpContent>> {
    logger.info(
      { tool_name: "gmail_send_email", to_count: args.to.length },
      "Tool invoked: gmail_send_email"
    );

    try {
      const result = await gmailService.sendEmail(args);
      return toMcpContent(result);
    } catch (error) {
      const errorResp = handleGoogleApiError(error, {
        tool_name: "gmail_send_email",
        operation: "sendEmail",
      });
      return toMcpContent(errorResp);
    }
  };
}
