import pino from "pino";
import { getConfig } from "../config/config.js";

/**
 * Structured logger with automatic redaction of sensitive fields.
 *
 * The following values are NEVER logged, even if accidentally passed:
 * - OAuth access tokens and refresh tokens
 * - Client secrets
 * - Email body content
 * - Document content
 */

const REDACTED_PATHS = [
  "access_token",
  "refresh_token",
  "client_secret",
  "*.access_token",
  "*.refresh_token",
  "*.client_secret",
  "body",
  "content",
  "email_body",
  "tokens.access_token",
  "tokens.refresh_token",
  "credentials.client_secret",
];

function createLogger() {
  // During tests, config may not be available — default to info
  let level = "info";
  try {
    level = getConfig().logging.level;
  } catch {
    // config not initialized yet; safe default
  }

  return pino({
    level,
    redact: {
      paths: REDACTED_PATHS,
      censor: "[REDACTED]",
    },
    base: {
      pid: false, // don't include PID in every log line (cleaner output over stdio)
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

export const logger = createLogger();

export type Logger = typeof logger;
