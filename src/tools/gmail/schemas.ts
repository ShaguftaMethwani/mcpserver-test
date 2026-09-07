import { z } from "zod";
import { emailArraySchema } from "../../validation/email.validator.js";
import { subjectSchema, bodySchema } from "../../validation/common.validator.js";

/**
 * Zod input schema for the `gmail_create_draft` tool.
 */
export const GmailCreateDraftSchema = z.object({
  to: emailArraySchema.min(1, "At least one recipient is required in 'to'."),
  cc: emailArraySchema.optional().default([]),
  bcc: emailArraySchema.optional().default([]),
  subject: subjectSchema,
  body: bodySchema,
  body_type: z.enum(["plain", "html"]).optional().default("plain"),
});

/**
 * Zod input schema for the `gmail_send_email` tool.
 * Intentionally identical to GmailCreateDraftSchema —
 * both operations require the same inputs.
 */
export const GmailSendEmailSchema = z.object({
  to: emailArraySchema.min(1, "At least one recipient is required in 'to'."),
  cc: emailArraySchema.optional().default([]),
  bcc: emailArraySchema.optional().default([]),
  subject: subjectSchema,
  body: bodySchema,
  body_type: z.enum(["plain", "html"]).optional().default("plain"),
});

export type GmailCreateDraftInput = z.infer<typeof GmailCreateDraftSchema>;
export type GmailSendEmailInput = z.infer<typeof GmailSendEmailSchema>;
