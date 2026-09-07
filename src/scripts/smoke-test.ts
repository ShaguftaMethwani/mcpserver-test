/**
 * Live Smoke Test — Gmail Draft + Google Docs Append
 *
 * This script exercises real Google API calls using the stored OAuth tokens.
 * It does NOT send any emails (only creates a draft that can be deleted).
 * It creates a temporary Google Doc, appends content to it, and reports results.
 *
 * Usage: npx tsx src/scripts/smoke-test.ts
 */
import "dotenv/config";
import { google } from "googleapis";
import { getConfig } from "../config/config.js";
import { GoogleAuthService } from "../services/google-auth.service.js";
import { GmailService } from "../services/gmail.service.js";
import { GoogleDocsService } from "../services/google-docs.service.js";

const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

function pass(label: string, detail: string) {
  console.log(`  ${GREEN}✅ PASS${RESET}  ${BOLD}${label}${RESET}  ${DIM}${detail}${RESET}`);
}

function fail(label: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.log(`  ${RED}❌ FAIL${RESET}  ${BOLD}${label}${RESET}\n         ${RED}${msg}${RESET}`);
}

function section(title: string) {
  console.log(`\n${CYAN}${BOLD}── ${title} ${"─".repeat(Math.max(0, 50 - title.length))}${RESET}`);
}

async function main() {
  console.log(`\n${BOLD}🔬 MCP Google Server — Live Integration Smoke Test${RESET}`);
  console.log(`${DIM}Using real OAuth tokens from tokens.json${RESET}\n`);

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  const config = getConfig();
  const authService = new GoogleAuthService(config);
  const gmailService = new GmailService(authService);
  const docsService = new GoogleDocsService(authService);

  let allPassed = true;

  // ── 1. Auth check ──────────────────────────────────────────────────────────
  section("1. OAuth Token Validation");
  let authClient;
  try {
    authClient = await authService.getAuthenticatedClient();
    const tokenInfo = authClient.credentials;
    const expiresAt = tokenInfo.expiry_date
      ? new Date(tokenInfo.expiry_date).toLocaleString()
      : "unknown";
    pass("Token loaded", `expires at ${expiresAt}`);
  } catch (err) {
    fail("Token loaded", err);
    allPassed = false;
    console.log(`\n${RED}Cannot continue without auth. Run: npm run auth${RESET}\n`);
    process.exit(1);
  }

  // Get the authenticated user's email for use in the draft
  let userEmail = "me";
  try {
    const gmail = google.gmail({ version: "v1", auth: authClient });
    const profile = await gmail.users.getProfile({ userId: "me" });
    userEmail = profile.data.emailAddress ?? "me";
    pass("Fetched Gmail profile", `signed in as ${userEmail}`);
  } catch (err) {
    fail("Fetched Gmail profile", err);
    allPassed = false;
  }

  // ── 2. Gmail — Create Draft ────────────────────────────────────────────────
  section("2. Gmail — Create Draft (not sent)");
  let draftId: string | undefined;
  try {
    const result = await gmailService.createDraft({
      to: [userEmail],
      subject: "[MCP Smoke Test] Draft — safe to delete",
      body: [
        "Hello! 👋",
        "",
        "This draft was created automatically by the MCP Google Server smoke test.",
        "It was never sent. You can safely delete it.",
        "",
        `Timestamp: ${new Date().toISOString()}`,
      ].join("\n"),
    });

    if (!result.success) throw new Error("createDraft returned success=false");
    draftId = result.draft_id;
    pass("Draft created", `draft_id = ${draftId}`);
  } catch (err) {
    fail("Draft created", err);
    allPassed = false;
  }

  // ── 3. Gmail — Delete the test draft (cleanup) ────────────────────────────
  section("3. Gmail — Cleanup Draft");
  if (draftId) {
    try {
      const gmail = google.gmail({ version: "v1", auth: authClient });
      await gmail.users.drafts.delete({ userId: "me", id: draftId });
      pass("Draft deleted", `draft_id = ${draftId} removed from your mailbox`);
    } catch (err) {
      // Non-fatal: draft can be cleaned up manually
      console.log(`  ${RED}⚠  WARN${RESET}  Could not delete draft: ${err instanceof Error ? err.message : err}`);
    }
  } else {
    console.log(`  ${DIM}⟶  Skipped (no draft was created)${RESET}`);
  }

  // ── 4. Google Docs — Create a temp doc ────────────────────────────────────
  section("4. Google Docs — Create Temporary Document");
  let testDocId: string | undefined;
  try {
    const docs = google.docs({ version: "v1", auth: authClient });
    const createRes = await docs.documents.create({
      requestBody: {
        title: `[MCP Smoke Test] ${new Date().toISOString()} — safe to delete`,
      },
    });
    testDocId = createRes.data.documentId ?? undefined;
    if (!testDocId) throw new Error("Docs API returned no documentId");
    pass("Document created", `doc_id = ${testDocId}`);
  } catch (err) {
    fail("Document created", err);
    allPassed = false;
  }

  // ── 5. Google Docs — Append content ───────────────────────────────────────
  section("5. Google Docs — Append Content");
  if (testDocId) {
    try {
      const result = await docsService.appendContent({
        document_id: testDocId,
        content: `MCP Smoke Test — content appended at ${new Date().toISOString()}`,
        add_newline: true,
      });

      if (!result.success) throw new Error("appendContent returned success=false");
      pass("Content appended", `document_id = ${result.document_id}`);
    } catch (err) {
      fail("Content appended", err);
      allPassed = false;
    }
  } else {
    console.log(`  ${DIM}⟶  Skipped (no document was created)${RESET}`);
  }

  // ── 6. Google Docs — Cleanup ───────────────────────────────────────────────
  section("6. Google Docs — Cleanup Temporary Document");
  if (testDocId) {
    try {
      const drive = google.drive({ version: "v3", auth: authClient });
      await drive.files.delete({ fileId: testDocId });
      pass("Document deleted", `doc_id = ${testDocId} moved to trash`);
    } catch (err) {
      console.log(`  ${RED}⚠  WARN${RESET}  Could not delete doc: ${err instanceof Error ? err.message : err}`);
      console.log(`  ${DIM}   You can delete it manually from Google Drive.${RESET}`);
    }
  } else {
    console.log(`  ${DIM}⟶  Skipped (no document was created)${RESET}`);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n${"─".repeat(55)}`);
  if (allPassed) {
    console.log(`${GREEN}${BOLD}🎉 All checks passed! MCP server is fully operational.${RESET}`);
  } else {
    console.log(`${RED}${BOLD}⚠  Some checks failed. Review the output above.${RESET}`);
  }
  console.log();
}

main().catch((err) => {
  console.error(`\n${RED}Fatal error:${RESET}`, err instanceof Error ? err.message : err);
  process.exit(1);
});
