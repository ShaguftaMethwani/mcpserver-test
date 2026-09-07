/**
 * Google Docs-specific TypeScript types for inputs and service responses.
 */

export interface GoogleDocsAppendInput {
  document_id: string;
  content: string;
  add_newline?: boolean;
}

export interface GoogleDocsAppendResult {
  success: true;
  document_id: string;
  message: string;
  [key: string]: unknown;
}

/**
 * Represents the end-of-document index information fetched before appending.
 */
export interface DocumentEndIndex {
  documentId: string;
  endIndex: number;
}
