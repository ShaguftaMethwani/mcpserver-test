import { describe, it, expect, vi, beforeEach } from "vitest";
import { createGoogleDocsAppendHandler } from "../../../src/tools/google-docs/append-content.tool.js";
import { GoogleDocsService } from "../../../src/services/google-docs.service.js";
import { ErrorCode } from "../../../src/errors/error-codes.js";
import { McpError } from "../../../src/errors/mcp-error.js";

function createMockDocsService(overrides?: Partial<GoogleDocsService>): GoogleDocsService {
  return {
    appendContent: vi.fn().mockResolvedValue({
      success: true,
      document_id: "doc-id-123",
      message: "Content appended successfully.",
    }),
    ...overrides,
  } as unknown as GoogleDocsService;
}

describe("google_docs_append tool handler", () => {
  let mockService: GoogleDocsService;
  let handler: ReturnType<typeof createGoogleDocsAppendHandler>;

  beforeEach(() => {
    mockService = createMockDocsService();
    handler = createGoogleDocsAppendHandler(mockService);
  });

  it("returns a success MCP response with document_id", async () => {
    const result = await handler({
      document_id: "doc-id-123",
      content: "New meeting notes",
      add_newline: false,
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.document_id).toBe("doc-id-123");
    expect(parsed.message).toBe("Content appended successfully.");
  });

  it("returns DOCUMENT_NOT_FOUND error when document does not exist", async () => {
    mockService = createMockDocsService({
      appendContent: vi.fn().mockRejectedValue(
        new McpError(ErrorCode.DOCUMENT_NOT_FOUND, "Document not found.")
      ),
    });
    handler = createGoogleDocsAppendHandler(mockService);

    const result = await handler({
      document_id: "nonexistent-id",
      content: "Some content",
      add_newline: false,
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error.code).toBe(ErrorCode.DOCUMENT_NOT_FOUND);
  });

  it("returns RATE_LIMITED error when API rate limit is hit", async () => {
    mockService = createMockDocsService({
      appendContent: vi.fn().mockRejectedValue(
        new McpError(ErrorCode.RATE_LIMITED, "Rate limit exceeded.")
      ),
    });
    handler = createGoogleDocsAppendHandler(mockService);

    const result = await handler({
      document_id: "doc-id-123",
      content: "Some content",
      add_newline: false,
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error.code).toBe(ErrorCode.RATE_LIMITED);
  });
});
