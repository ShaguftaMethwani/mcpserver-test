import { vi } from "vitest";

/**
 * Mock factory for the Gmail API client.
 * Returns a jest-compatible mock of `google.gmail({ version: "v1", auth })`.
 */
export function createMockGmailClient(overrides?: {
  draftId?: string;
  messageId?: string;
  threadId?: string;
  shouldFail?: boolean;
  failStatus?: number;
}) {
  const opts = {
    draftId: "mock-draft-id-123",
    messageId: "mock-message-id-abc",
    threadId: "mock-thread-id-xyz",
    shouldFail: false,
    failStatus: 500,
    ...overrides,
  };

  const mockDraftsCreate = opts.shouldFail
    ? vi.fn().mockRejectedValue(makeMockGaxiosError(opts.failStatus))
    : vi.fn().mockResolvedValue({ data: { id: opts.draftId } });

  const mockMessagesSend = opts.shouldFail
    ? vi.fn().mockRejectedValue(makeMockGaxiosError(opts.failStatus))
    : vi.fn().mockResolvedValue({
        data: { id: opts.messageId, threadId: opts.threadId },
      });

  return {
    users: {
      drafts: { create: mockDraftsCreate },
      messages: { send: mockMessagesSend },
    },
    _mocks: {
      draftsCreate: mockDraftsCreate,
      messagesSend: mockMessagesSend,
    },
  };
}

export function makeMockGaxiosError(status: number, message = "Google API Error") {
  const err = new Error(message) as Error & {
    response: { status: number; data: { error: { message: string } } };
  };
  err.response = { status, data: { error: { message } } };
  return err;
}
