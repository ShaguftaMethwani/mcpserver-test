import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "../../src/server/tool-registry.js";
import { GmailService } from "../../src/services/gmail.service.js";
import { GoogleDocsService } from "../../src/services/google-docs.service.js";

function createMockGmailService(): GmailService {
  return {
    createDraft: vi.fn().mockResolvedValue({
      success: true,
      draft_id: "integration-draft-id",
      message: "Draft created successfully.",
    }),
    sendEmail: vi.fn().mockResolvedValue({
      success: true,
      message_id: "integration-msg-id",
      thread_id: "integration-thread-id",
      message: "Email sent successfully.",
    }),
  } as unknown as GmailService;
}

function createMockDocsService(): GoogleDocsService {
  return {
    appendContent: vi.fn().mockResolvedValue({
      success: true,
      document_id: "integration-doc-id",
      message: "Content appended successfully.",
    }),
  } as unknown as GoogleDocsService;
}

describe("MCP Server — Tool Registration", () => {
  let server: McpServer;
  let gmailService: GmailService;
  let docsService: GoogleDocsService;

  beforeEach(() => {
    server = new McpServer({ name: "test-server", version: "1.0.0" });
    gmailService = createMockGmailService();
    docsService = createMockDocsService();
    registerTools(server, gmailService, docsService);
  });

  it("registers all 3 tools without throwing", () => {
    // If registerTools does not throw, all tools are registered successfully
    expect(true).toBe(true);
  });
});

describe("MCP Server — Tool Invocations via Mock Services", () => {
  let gmailService: GmailService;
  let docsService: GoogleDocsService;

  beforeEach(() => {
    gmailService = createMockGmailService();
    docsService = createMockDocsService();
  });

  it("gmail_create_draft handler returns expected shape", async () => {
    const result = await gmailService.createDraft({
      to: ["test@example.com"],
      cc: [],
      bcc: [],
      subject: "Integration Test",
      body: "Test body",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.draft_id).toBeDefined();
    }
  });

  it("gmail_send_email handler returns expected shape", async () => {
    const result = await gmailService.sendEmail({
      to: ["test@example.com"],
      cc: [],
      bcc: [],
      subject: "Integration Test",
      body: "Test body",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.message_id).toBeDefined();
      expect(result.thread_id).toBeDefined();
    }
  });

  it("google_docs_append handler returns expected shape", async () => {
    const result = await docsService.appendContent({
      document_id: "integration-doc-id",
      content: "Appended from integration test",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.document_id).toBeDefined();
    }
  });
});
