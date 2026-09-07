import type { GaxiosError } from "gaxios";
import { ErrorCode } from "./error-codes.js";
import { McpError } from "./mcp-error.js";
import { errorResponse, McpErrorResponse } from "../types/mcp.types.js";
import { logger } from "../logging/logger.js";

/**
 * Translates a raw Google API (GaxiosError) or generic error
 * into a structured McpErrorResponse.
 *
 * Raw stack traces and internal error details are NEVER forwarded to clients.
 * They are logged server-side only.
 */
export function handleGoogleApiError(
  error: unknown,
  context: { tool_name: string; operation: string }
): McpErrorResponse {
  // Already a McpError — use it directly
  if (error instanceof McpError) {
    logger.warn(
      { tool_name: context.tool_name, operation: context.operation, error_code: error.code },
      error.message
    );
    return error.toErrorResponse();
  }

  // Google API (Gaxios) error
  if (isGaxiosError(error)) {
    const status = error.response?.status;
    const serverMessage = error.response?.data?.error?.message ?? error.message;

    logger.error(
      {
        tool_name: context.tool_name,
        operation: context.operation,
        http_status: status,
        google_error: serverMessage,
      },
      "Google API error"
    );

    const { code, message } = mapHttpStatusToError(status, serverMessage);
    return errorResponse(code, message);
  }

  // Generic / unexpected error
  const message = error instanceof Error ? error.message : "An unexpected error occurred.";
  logger.error(
    { tool_name: context.tool_name, operation: context.operation, error: message },
    "Unexpected internal error"
  );

  return errorResponse(ErrorCode.INTERNAL_ERROR, "An unexpected internal error occurred.");
}

function mapHttpStatusToError(
  status: number | undefined,
  _serverMessage: string
): { code: ErrorCode; message: string } {
  switch (status) {
    case 401:
      return {
        code: ErrorCode.AUTHENTICATION_REQUIRED,
        message:
          "Google authentication is required or your session has expired. Run `npm run auth` to re-authenticate.",
      };
    case 403:
      return {
        code: ErrorCode.PERMISSION_DENIED,
        message:
          "You do not have permission to perform this operation. Check your OAuth scopes and Google account permissions.",
      };
    case 404:
      return {
        code: ErrorCode.DOCUMENT_NOT_FOUND,
        message:
          "The specified resource was not found. Check that the document ID is correct and the document is accessible.",
      };
    case 429:
      return {
        code: ErrorCode.RATE_LIMITED,
        message: "Google API rate limit exceeded. Please wait a moment before retrying.",
      };
    default:
      return {
        code: ErrorCode.GOOGLE_API_ERROR,
        message:
          "A Google API error occurred. The operation could not be completed. Please try again later.",
      };
  }
}

function isGaxiosError(error: unknown): error is GaxiosError<{ error: { message: string } }> {
  return (
    error instanceof Error &&
    "response" in error &&
    typeof (error as Record<string, unknown>)["response"] === "object"
  );
}
