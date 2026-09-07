import { z } from "zod";
import { documentIdSchema, appendContentSchema } from "../../validation/common.validator.js";

/**
 * Zod input schema for the `google_docs_append` tool.
 */
export const GoogleDocsAppendSchema = z.object({
  document_id: documentIdSchema,
  content: appendContentSchema,
  add_newline: z
    .boolean()
    .optional()
    .default(false)
    .describe("When true, prepends a newline before the appended content."),
});

export type GoogleDocsAppendInput = z.infer<typeof GoogleDocsAppendSchema>;
