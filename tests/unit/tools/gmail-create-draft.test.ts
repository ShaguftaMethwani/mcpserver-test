import { describe, it, expect, vi, beforeEach } from "vitest";
import { createGmailCreateDraftHandler } from "../../../src/tools/gmail/create-draft.tool.js";
import { GmailService } from "../../../src/services/gmail.service.js";
import { ErrorCode } from "../../../src/errors/error-codes.js";
import { McpError } from "../../../src/errors/mcp-error.js";

function createMockGmailService(overrides?: Partial<GmailService>): GmailService {
  return {
    createDraft: vi.fn().mockResolvedValue({
      success: true,
      draft_id: "draft-123",
      message: "Draft created successfully.",
    }),
    sendEmail: vi.fn(),
    ...overrides,
  } as unknown as GmailService;
}

describe("gmail_create_draft tool handler", () => {
  let mockService: GmailService;
  let handler: ReturnType<typeof createGmailCreateDraftHandler>;

  beforeEach(() => {
    mockService = createMockGmailService();
    handler = createGmailCreateDraftHandler(mockService);
  });

  it("returns a success MCP response when draft is created", async () => {
    const result = await handler({
      to: ["user@example.com"],
      cc: [],
      bcc: [],
      subject: "Hello",
      body: "World",
      body_type: "plain",
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.draft_id).toBe("draft-123");
  });

  it("returns an error MCP response when the service throws a McpError", async () => {
    mockService = createMockGmailService({
      createDraft: vi.fn().mockRejectedValue(
        new McpError(ErrorCode.AUTHENTICATION_REQUIRED, "Auth required")
      ),
    });
    handler = createGmailCreateDraftHandler(mockService);

    const result = await handler({
      to: ["user@example.com"],
      cc: [],
      bcc: [],
      subject: "Hello",
      body: "World",
      body_type: "plain",
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error.code).toBe(ErrorCode.AUTHENTICATION_REQUIRED);
  });

  it("returns an error MCP response for unexpected errors", async () => {
    mockService = createMockGmailService({
      createDraft: vi.fn().mockRejectedValue(new Error("Unexpected")),
    });
    handler = createGmailCreateDraftHandler(mockService);

    const result = await handler({
      to: ["user@example.com"],
      cc: [],
      bcc: [],
      subject: "Hello",
      body: "World",
      body_type: "plain",
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error.code).toBe(ErrorCode.INTERNAL_ERROR);
  });
});
