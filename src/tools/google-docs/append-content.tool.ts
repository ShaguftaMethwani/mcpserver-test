import { GoogleDocsService } from "../../services/google-docs.service.js";
import { GoogleDocsAppendInput } from "./schemas.js";
import { toMcpContent } from "../../types/mcp.types.js";
import { handleGoogleApiError } from "../../errors/error-handler.js";
import { logger } from "../../logging/logger.js";

/**
 * MCP tool handler for `google_docs_append`.
 *
 * This is a thin adapter between the MCP SDK and GoogleDocsService.
 * All business logic lives in the service layer.
 */
export function createGoogleDocsAppendHandler(docsService: GoogleDocsService) {
  return async function handleGoogleDocsAppend(
    args: GoogleDocsAppendInput
  ): Promise<ReturnType<typeof toMcpContent>> {
    logger.info(
      { tool_name: "google_docs_append", document_id: args.document_id },
      "Tool invoked: google_docs_append"
    );

    try {
      const result = await docsService.appendContent(args);
      return toMcpContent(result);
    } catch (error) {
      const errorResp = handleGoogleApiError(error, {
        tool_name: "google_docs_append",
        operation: "appendContent",
      });
      return toMcpContent(errorResp);
    }
  };
}
