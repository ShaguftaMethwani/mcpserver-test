import { z } from "zod";

/**
 * Email address validation using a standard RFC 5322-compatible pattern.
 * Validates format only; does not perform DNS/MX lookups.
 */
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

/**
 * Validates a single email address string.
 */
export const emailSchema = z
  .string()
  .min(1, "Email address cannot be empty.")
  .max(254, "Email address exceeds maximum length of 254 characters.")
  .refine(
    (email) => EMAIL_REGEX.test(email),
    (email) => ({ message: `"${email}" is not a valid email address.` })
  );

/**
 * Validates an array of email addresses.
 * Each element must pass individual email validation.
 */
export const emailArraySchema = z.array(emailSchema).max(50, "Maximum of 50 email addresses allowed.");

/**
 * Convenience function to validate a single email string.
 * Returns { valid: true } or { valid: false, error: string }.
 */
export function validateEmail(email: string): { valid: true } | { valid: false; error: string } {
  const result = emailSchema.safeParse(email);
  if (result.success) return { valid: true };
  return { valid: false, error: result.error.errors[0]?.message ?? "Invalid email." };
}

/**
 * Convenience function to validate an array of email strings.
 * Returns { valid: true } or { valid: false, error: string }.
 */
export function validateEmails(
  emails: string[]
): { valid: true } | { valid: false; error: string } {
  const result = emailArraySchema.safeParse(emails);
  if (result.success) return { valid: true };
  return { valid: false, error: result.error.errors[0]?.message ?? "Invalid email addresses." };
}
