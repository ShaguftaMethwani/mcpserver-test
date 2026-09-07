import { ErrorCode } from "./error-codes.js";

/**
 * Custom error class for MCP-aware error handling.
 *
 * Carries a structured error code alongside the message,
 * enabling clean translation to MCP error responses without
 * exposing raw stack traces to clients.
 */
export class McpError extends Error {
  public readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = "McpError";
    this.code = code;

    // Maintain proper prototype chain in transpiled ES5 targets
    Object.setPrototypeOf(this, McpError.prototype);
  }

  /**
   * Serialize to a plain error response object suitable for MCP responses.
   */
  toErrorResponse(): { success: false; error: { code: string; message: string } } {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
      },
    };
  }
}
