import { google, gmail_v1 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { GoogleAuthService } from "./google-auth.service.js";
import { GmailDraftInput, GmailSendInput, GmailDraftResult, GmailSendResult, MimeMessage, EmailBodyType } from "../types/gmail.types.js";
import { logger } from "../logging/logger.js";
import { McpError } from "../errors/mcp-error.js";
import { ErrorCode } from "../errors/error-codes.js";

/**
 * Service encapsulating all Gmail API interactions.
 *
 * Responsibilities:
 * - Construct RFC 2822 MIME messages
 * - Encode messages as base64url for the Gmail API
 * - Create drafts via gmail.users.drafts.create
 * - Send emails via gmail.users.messages.send
 *
 * This service has NO knowledge of MCP — it speaks only in typed inputs/outputs.
 */
export class GmailService {
  private readonly authService: GoogleAuthService;

  constructor(authService: GoogleAuthService) {
    this.authService = authService;
  }

  /**
   * Creates a Gmail draft without sending it.
   */
  async createDraft(input: GmailDraftInput): Promise<GmailDraftResult> {
    const auth = await this.authService.getAuthenticatedClient();
    const gmail = google.gmail({ version: "v1", auth });

    const mimeMessage = this.buildMimeMessage({
      to: input.to,
      cc: input.cc ?? [],
      bcc: input.bcc ?? [],
      subject: input.subject,
      body: input.body,
      bodyType: input.body_type ?? "plain",
    });

    const encoded = this.encodeBase64Url(mimeMessage);

    logger.info({ tool_name: "gmail_create_draft", operation: "drafts.create" }, "Creating Gmail draft");

    const response = await gmail.users.drafts.create({
      userId: "me",
      requestBody: {
        message: { raw: encoded },
      },
    });

    const draftId = response.data.id;
    if (!draftId) {
      throw new McpError(ErrorCode.GOOGLE_API_ERROR, "Gmail API returned a draft without an ID.");
    }

    logger.info(
      { tool_name: "gmail_create_draft", operation: "drafts.create", success: true },
      "Gmail draft created"
    );

    return {
      success: true,
      draft_id: draftId,
      message: "Draft created successfully.",
    };
  }

  /**
   * Sends an email immediately through Gmail.
   */
  async sendEmail(input: GmailSendInput): Promise<GmailSendResult> {
    const auth = await this.authService.getAuthenticatedClient();
    const gmail = google.gmail({ version: "v1", auth });

    const mimeMessage = this.buildMimeMessage({
      to: input.to,
      cc: input.cc ?? [],
      bcc: input.bcc ?? [],
      subject: input.subject,
      body: input.body,
      bodyType: input.body_type ?? "plain",
    });

    const encoded = this.encodeBase64Url(mimeMessage);

    logger.info({ tool_name: "gmail_send_email", operation: "messages.send" }, "Sending Gmail email");

    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encoded },
    });

    const messageId = response.data.id;
    const threadId = response.data.threadId;

    if (!messageId) {
      throw new McpError(ErrorCode.GOOGLE_API_ERROR, "Gmail API returned a sent message without an ID.");
    }

    logger.info(
      { tool_name: "gmail_send_email", operation: "messages.send", success: true },
      "Gmail email sent"
    );

    return {
      success: true,
      message_id: messageId,
      thread_id: threadId ?? "",
      message: "Email sent successfully.",
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Constructs an RFC 2822 MIME message string from the given parameters.
   */
  private buildMimeMessage(msg: MimeMessage): string {
    const contentType =
      msg.bodyType === "html" ? "text/html; charset=UTF-8" : "text/plain; charset=UTF-8";

    const headers: string[] = [
      `To: ${msg.to.join(", ")}`,
      ...(msg.cc.length > 0 ? [`Cc: ${msg.cc.join(", ")}`] : []),
      ...(msg.bcc.length > 0 ? [`Bcc: ${msg.bcc.join(", ")}`] : []),
      `Subject: ${this.encodeSubject(msg.subject)}`,
      "MIME-Version: 1.0",
      `Content-Type: ${contentType}`,
      "Content-Transfer-Encoding: quoted-printable",
    ];

    return [...headers, "", msg.body].join("\r\n");
  }

  /**
   * Encodes a string as base64url (URL-safe base64 without padding).
   * The Gmail API requires raw messages to be encoded in this format.
   */
  private encodeBase64Url(text: string): string {
    return Buffer.from(text)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  /**
   * Encodes a subject line for non-ASCII characters using RFC 2047 UTF-8 encoding.
   */
  private encodeSubject(subject: string): string {
    // Only encode if subject contains non-ASCII characters
    if (/^[\x00-\x7F]*$/.test(subject)) {
      return subject;
    }
    const encoded = Buffer.from(subject).toString("base64");
    return `=?UTF-8?B?${encoded}?=`;
  }
}
