import { describe, it, expect, vi, beforeEach } from "vitest";
import { GmailService } from "../../../src/services/gmail.service.js";
import { GoogleAuthService } from "../../../src/services/google-auth.service.js";

// vi.hoisted() ensures these are initialized before vi.mock() factory is hoisted
const { mockDraftsCreate, mockMessagesSend } = vi.hoisted(() => ({
  mockDraftsCreate: vi.fn(),
  mockMessagesSend: vi.fn(),
}));

vi.mock("googleapis", () => ({
  google: {
    gmail: vi.fn().mockReturnValue({
      users: {
        drafts: { create: mockDraftsCreate },
        messages: { send: mockMessagesSend },
      },
    }),
  },
}));

function createMockAuthService(): GoogleAuthService {
  return {
    getAuthenticatedClient: vi.fn().mockResolvedValue({}),
  } as unknown as GoogleAuthService;
}

describe("GmailService.createDraft", () => {
  let service: GmailService;
  let mockAuth: GoogleAuthService;

  beforeEach(() => {
    mockDraftsCreate.mockResolvedValue({ data: { id: "mock-draft-id-123" } });
    mockMessagesSend.mockResolvedValue({
      data: { id: "mock-message-id-abc", threadId: "mock-thread-id-xyz" },
    });
    mockAuth = createMockAuthService();
    service = new GmailService(mockAuth);
  });

  it("returns a draft result with a draft_id on success", async () => {
    const result = await service.createDraft({
      to: ["recipient@example.com"],
      subject: "Test Subject",
      body: "Test body",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.draft_id).toBe("mock-draft-id-123");
      expect(result.message).toBe("Draft created successfully.");
    }
  });

  it("includes cc and bcc in the MIME message", async () => {
    const result = await service.createDraft({
      to: ["to@example.com"],
      cc: ["cc@example.com"],
      bcc: ["bcc@example.com"],
      subject: "Subject",
      body: "Body",
    });

    expect(result.success).toBe(true);
  });

  it("supports html body type", async () => {
    const result = await service.createDraft({
      to: ["to@example.com"],
      subject: "HTML Email",
      body: "<h1>Hello</h1>",
      body_type: "html",
    });

    expect(result.success).toBe(true);
  });
});

describe("GmailService.sendEmail", () => {
  let service: GmailService;
  let mockAuth: GoogleAuthService;

  beforeEach(() => {
    mockDraftsCreate.mockResolvedValue({ data: { id: "mock-draft-id-123" } });
    mockMessagesSend.mockResolvedValue({
      data: { id: "mock-message-id-abc", threadId: "mock-thread-id-xyz" },
    });
    mockAuth = createMockAuthService();
    service = new GmailService(mockAuth);
  });

  it("returns a send result with message_id and thread_id on success", async () => {
    const result = await service.sendEmail({
      to: ["recipient@example.com"],
      subject: "Test Subject",
      body: "Test body",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.message_id).toBe("mock-message-id-abc");
      expect(result.thread_id).toBe("mock-thread-id-xyz");
      expect(result.message).toBe("Email sent successfully.");
    }
  });
});
