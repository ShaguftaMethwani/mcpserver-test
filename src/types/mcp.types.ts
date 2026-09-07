/**
 * Shared MCP response types used across all tool handlers.
 */

export interface McpSuccessResponse {
  success: true;
  message: string;
}

export interface McpErrorDetail {
  code: string;
  message: string;
}

export interface McpErrorResponse {
  success: false;
  error: McpErrorDetail;
}

export type McpToolResponse = McpSuccessResponse | McpErrorResponse;

/**
 * Helper to create a standardized success response.
 */
export function successResponse(
  message: string,
  extra?: Record<string, unknown>
): McpSuccessResponse & Record<string, unknown> {
  return { success: true, message, ...extra };
}

/**
 * Helper to create a standardized error response.
 */
export function errorResponse(
  code: string,
  message: string
): McpErrorResponse {
  return { success: false, error: { code, message } };
}

/**
 * Wraps any serializable response object as an MCP SDK-compatible text content block.
 */
export function toMcpContent(response: object): {
  content: Array<{ type: "text"; text: string }>;
} {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }],
  };
}
