import { describe, it, expect, vi, beforeEach } from "vitest";
import { GoogleDocsService } from "../../../src/services/google-docs.service.js";
import { GoogleAuthService } from "../../../src/services/google-auth.service.js";
import { createMockDocsClient } from "../../mocks/google-docs-api.mock.js";
import { ErrorCode } from "../../../src/errors/error-codes.js";
import { McpError } from "../../../src/errors/mcp-error.js";

let mockDocsClient = createMockDocsClient({ endIndex: 100 });

vi.mock("googleapis", () => ({
  google: {
    docs: vi.fn().mockImplementation(() => mockDocsClient),
  },
}));

function createMockAuthService(): GoogleAuthService {
  return {
    getAuthenticatedClient: vi.fn().mockResolvedValue({}),
  } as unknown as GoogleAuthService;
}

describe("GoogleDocsService.appendContent", () => {
  let service: GoogleDocsService;
  let mockAuth: GoogleAuthService;

  beforeEach(() => {
    mockDocsClient = createMockDocsClient({ endIndex: 100 });
    mockAuth = createMockAuthService();
    service = new GoogleDocsService(mockAuth);
  });

  it("appends content and returns success", async () => {
    const result = await service.appendContent({
      document_id: "mock-doc-id-123",
      content: "New content",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.document_id).toBe("mock-doc-id-123");
      expect(result.message).toBe("Content appended successfully.");
    }
  });

  it("calls batchUpdate with insertText at endIndex - 1", async () => {
    await service.appendContent({
      document_id: "mock-doc-id-123",
      content: "New content",
    });

    const batchUpdateCall = mockDocsClient._mocks.docsBatchUpdate.mock.calls[0]?.[0];
    const insertRequest = batchUpdateCall?.requestBody?.requests?.[0]?.insertText;

    expect(insertRequest?.location?.index).toBe(99); // endIndex(100) - 1
    expect(insertRequest?.text).toBe("New content");
  });

  it("prepends a newline when add_newline is true", async () => {
    await service.appendContent({
      document_id: "mock-doc-id-123",
      content: "Content after newline",
      add_newline: true,
    });

    const batchUpdateCall = mockDocsClient._mocks.docsBatchUpdate.mock.calls[0]?.[0];
    const insertText = batchUpdateCall?.requestBody?.requests?.[0]?.insertText?.text;
    expect(insertText).toBe("\nContent after newline");
  });

  it("throws DOCUMENT_NOT_FOUND for a 404 error on document get", async () => {
    mockDocsClient = createMockDocsClient({ shouldFailGet: true, failStatus: 404 });
    service = new GoogleDocsService(mockAuth);

    await expect(
      service.appendContent({ document_id: "nonexistent", content: "test" })
    ).rejects.toMatchObject({
      code: ErrorCode.DOCUMENT_NOT_FOUND,
    });
  });
});
