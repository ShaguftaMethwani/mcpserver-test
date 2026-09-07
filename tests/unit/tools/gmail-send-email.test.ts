import { describe, it, expect, vi, beforeEach } from "vitest";
import { createGmailSendEmailHandler } from "../../../src/tools/gmail/send-email.tool.js";
import { GmailService } from "../../../src/services/gmail.service.js";
import { ErrorCode } from "../../../src/errors/error-codes.js";
import { McpError } from "../../../src/errors/mcp-error.js";

function createMockGmailService(overrides?: Partial<GmailService>): GmailService {
  return {
    createDraft: vi.fn(),
    sendEmail: vi.fn().mockResolvedValue({
      success: true,
      message_id: "msg-abc",
      thread_id: "thread-xyz",
      message: "Email sent successfully.",
    }),
    ...overrides,
  } as unknown as GmailService;
}

describe("gmail_send_email tool handler", () => {
  let mockService: GmailService;
  let handler: ReturnType<typeof createGmailSendEmailHandler>;

  beforeEach(() => {
    mockService = createMockGmailService();
    handler = createGmailSendEmailHandler(mockService);
  });

  it("returns a success MCP response with message_id and thread_id", async () => {
    const result = await handler({
      to: ["user@example.com"],
      cc: [],
      bcc: [],
      subject: "Report Ready",
      body: "Your report is ready.",
      body_type: "plain",
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.message_id).toBe("msg-abc");
    expect(parsed.thread_id).toBe("thread-xyz");
  });

  it("returns PERMISSION_DENIED error when service throws 403 McpError", async () => {
    mockService = createMockGmailService({
      sendEmail: vi.fn().mockRejectedValue(
        new McpError(ErrorCode.PERMISSION_DENIED, "Insufficient permissions")
      ),
    });
    handler = createGmailSendEmailHandler(mockService);

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
    expect(parsed.error.code).toBe(ErrorCode.PERMISSION_DENIED);
  });
});
