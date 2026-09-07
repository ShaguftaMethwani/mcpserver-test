import { google } from "googleapis";
import { GoogleAuthService } from "./google-auth.service.js";
import { GoogleDocsAppendInput, GoogleDocsAppendResult } from "../types/google-docs.types.js";
import { logger } from "../logging/logger.js";
import { McpError } from "../errors/mcp-error.js";
import { ErrorCode } from "../errors/error-codes.js";

/**
 * Service encapsulating all Google Docs API interactions.
 *
 * Responsibilities:
 * - Fetch the current document structure to find the correct insertion index
 * - Construct batchUpdate insertText requests that preserve existing content
 * - Handle the Google Docs API's structural model correctly:
 *     The document body always ends with a trailing newline (\n) at `endIndex - 1`.
 *     We must insert BEFORE this trailing newline to avoid corrupting the structure.
 *
 * This service has NO knowledge of MCP — it speaks only in typed inputs/outputs.
 */
export class GoogleDocsService {
  private readonly authService: GoogleAuthService;

  constructor(authService: GoogleAuthService) {
    this.authService = authService;
  }

  /**
   * Appends text content to the end of an existing Google Doc.
   * Preserves all existing content.
   */
  async appendContent(input: GoogleDocsAppendInput): Promise<GoogleDocsAppendResult> {
    const auth = await this.authService.getAuthenticatedClient();
    const docs = google.docs({ version: "v1", auth });

    logger.info(
      { tool_name: "google_docs_append", operation: "documents.get", document_id: input.document_id },
      "Fetching document structure"
    );

    // Step 1: Fetch document to determine the insertion index
    let docResponse;
    try {
      docResponse = await docs.documents.get({
        documentId: input.document_id,
      });
    } catch (err: unknown) {
      // Re-map 404 specifically for documents
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        throw new McpError(
          ErrorCode.DOCUMENT_NOT_FOUND,
          `Document "${input.document_id}" was not found or you do not have access to it.`
        );
      }
      throw err; // let the caller's error handler deal with it
    }

    const body = docResponse.data.body;
    if (!body || !body.content || body.content.length === 0) {
      throw new McpError(
        ErrorCode.INVALID_DOCUMENT,
        "The document has no readable body content. It may be empty or have an unsupported structure."
      );
    }

    // Step 2: Find the end index of the document body.
    //
    // Google Docs API: the body content array contains structural elements.
    // The document always ends with a trailing paragraph containing \n.
    // `endIndex` of the last element points AFTER the newline.
    // We must insert at `endIndex - 1` to place content before the trailing newline.
    const lastElement = body.content[body.content.length - 1];
    const rawEndIndex = lastElement?.endIndex;

    if (rawEndIndex === undefined || rawEndIndex === null) {
      throw new McpError(
        ErrorCode.INVALID_DOCUMENT,
        "Could not determine the document end index. The document structure may be unsupported."
      );
    }

    // Insert before the trailing newline (endIndex - 1)
    const insertionIndex = rawEndIndex - 1;

    if (insertionIndex < 1) {
      throw new McpError(
        ErrorCode.INVALID_DOCUMENT,
        "The document end index is invalid. The document may be malformed."
      );
    }

    // Step 3: Prepare the text to insert
    const textToInsert = input.add_newline ? `\n${input.content}` : input.content;

    logger.info(
      {
        tool_name: "google_docs_append",
        operation: "documents.batchUpdate",
        document_id: input.document_id,
        insertion_index: insertionIndex,
      },
      "Appending content to document"
    );

    // Step 4: Execute batchUpdate with insertText request
    await docs.documents.batchUpdate({
      documentId: input.document_id,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: insertionIndex },
              text: textToInsert,
            },
          },
        ],
      },
    });

    logger.info(
      {
        tool_name: "google_docs_append",
        operation: "documents.batchUpdate",
        document_id: input.document_id,
        success: true,
      },
      "Content appended to document"
    );

    return {
      success: true,
      document_id: input.document_id,
      message: "Content appended successfully.",
    };
  }
}
