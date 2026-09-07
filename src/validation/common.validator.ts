import { z } from "zod";

/**
 * Shared validators and Zod helpers used across multiple tools.
 */

/**
 * Non-empty trimmed string. Rejects blank/whitespace-only values.
 */
export const nonEmptyString = (fieldName: string) =>
  z
    .string()
    .min(1, `${fieldName} is required.`)
    .refine((s) => s.trim().length > 0, `${fieldName} cannot be blank or whitespace only.`);

/**
 * Google Docs document ID validator.
 * Document IDs are alphanumeric strings (with hyphens and underscores), typically 44 chars.
 */
export const documentIdSchema = z
  .string()
  .min(10, "Document ID appears too short. Verify the Google Docs URL.")
  .max(128, "Document ID appears too long.")
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Document ID must contain only alphanumeric characters, hyphens, and underscores."
  );

/**
 * Email subject validator — reasonable length limit.
 */
export const subjectSchema = z
  .string()
  .min(1, "Subject is required.")
  .max(998, "Subject exceeds the maximum allowed length of 998 characters (RFC 5322).");

/**
 * Email body validator — prevents absurdly large payloads.
 */
export const bodySchema = z
  .string()
  .min(1, "Body is required.")
  .max(10_000_000, "Body exceeds the 10 MB limit."); // Gmail API limit is ~25MB; we add a safe guard

/**
 * Append content validator.
 */
export const appendContentSchema = z
  .string()
  .min(1, "Content to append cannot be empty.")
  .max(1_000_000, "Content exceeds the 1 MB append limit.");
