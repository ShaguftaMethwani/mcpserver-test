/**
 * Enumerated error codes for all failure scenarios.
 * These codes are returned to MCP clients in error responses.
 */
export enum ErrorCode {
  // --- Authentication ---
  /** No Google credentials configured. */
  AUTHENTICATION_REQUIRED = "AUTHENTICATION_REQUIRED",
  /** Access token expired and refresh also failed. */
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  /** Insufficient OAuth scopes for the requested operation. */
  PERMISSION_DENIED = "PERMISSION_DENIED",

  // --- Validation ---
  /** One or more required input fields are missing or empty. */
  MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",
  /** An input field contains an invalid value. */
  INVALID_INPUT = "INVALID_INPUT",
  /** An email address is malformed or invalid. */
  INVALID_EMAIL = "INVALID_EMAIL",

  // --- Google Docs ---
  /** The specified Google Doc does not exist or is inaccessible. */
  DOCUMENT_NOT_FOUND = "DOCUMENT_NOT_FOUND",
  /** The Google Doc has an unexpected structure. */
  INVALID_DOCUMENT = "INVALID_DOCUMENT",

  // --- Google API ---
  /** Google API responded with a rate limiting error. */
  RATE_LIMITED = "RATE_LIMITED",
  /** A Google API call failed for an unclassified reason. */
  GOOGLE_API_ERROR = "GOOGLE_API_ERROR",

  // --- Internal ---
  /** An unexpected internal server error occurred. */
  INTERNAL_ERROR = "INTERNAL_ERROR",
}
