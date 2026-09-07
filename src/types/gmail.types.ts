/**
 * Gmail-specific TypeScript types for inputs and service responses.
 */

export type EmailBodyType = "plain" | "html";

export interface GmailDraftInput {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  body_type?: EmailBodyType;
}

export interface GmailSendInput {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  body_type?: EmailBodyType;
}

export interface GmailDraftResult {
  success: true;
  draft_id: string;
  message: string;
  [key: string]: unknown;
}

export interface GmailSendResult {
  success: true;
  message_id: string;
  thread_id: string;
  message: string;
  [key: string]: unknown;
}

/** Internal MIME message representation before base64url encoding. */
export interface MimeMessage {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  bodyType: EmailBodyType;
}
