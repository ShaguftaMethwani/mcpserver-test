/**
 * Standalone authorization script — manual code flow.
 * Run via: npm run auth
 *
 * Works with "installed" / Desktop app credentials without needing sudo or
 * changing registered redirect URIs. When the browser redirects to
 * http://localhost (or localhost:port) with ?code=..., you paste the full
 * redirect URL (or just the code value) here.
 */
import { createInterface } from "readline";
import { exec } from "child_process";
import { getConfig } from "../config/config.js";
import { GoogleAuthService } from "../services/google-auth.service.js";
import { google } from "googleapis";

/** Open a URL in the system default browser (macOS / Linux / Windows). */
function openBrowser(url: string): void {
  const cmd =
    process.platform === "darwin"
      ? `open "${url}"`
      : process.platform === "win32"
      ? `start "" "${url}"`
      : `xdg-open "${url}"`;

  exec(cmd, (err) => {
    if (err) {
      // Opening the browser failed silently — user still has the URL printed
    }
  });
}

/** Read a line from stdin. */
function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stderr });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Extract the authorization code from either:
 * - A full redirect URL: http://localhost?code=4/0Adxxx...
 * - Just the raw code: 4/0Adxxx...
 */
function extractCode(input: string): string {
  input = input.trim();
  try {
    const url = new URL(input);
    const code = url.searchParams.get("code");
    if (code) return code;
  } catch {
    // not a URL — treat input as the raw code
  }
  return input;
}

async function main(): Promise<void> {
  let config;
  try {
    config = getConfig();
  } catch (err) {
    process.stderr.write(
      `\n❌ Configuration error: ${err instanceof Error ? err.message : String(err)}\n`
    );
    process.stderr.write("Copy .env.example to .env and fill in your Google credentials.\n\n");
    process.exit(1);
  }

  const authService = new GoogleAuthService(config);

  // Check if already authorized
  const existingTokens = await authService.loadStoredTokens();
  if (existingTokens?.refresh_token) {
    process.stderr.write(
      "\n✅ Already authorized! Tokens found at: " + config.google.tokenPath + "\n"
    );
    process.stderr.write("To re-authorize, delete the token file and run this script again.\n\n");
    process.exit(0);
  }

  const oauth2Client = new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    config.google.redirectUri
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: config.google.scopes,
    prompt: "consent", // force refresh_token to be issued
  });

  process.stderr.write("\n=== Google OAuth Authorization ===\n\n");
  process.stderr.write("Step 1: Opening authorization URL in your browser...\n");
  process.stderr.write("        If the browser doesn't open, copy this URL manually:\n\n");
  process.stderr.write(authUrl + "\n\n");

  openBrowser(authUrl);

  process.stderr.write("Step 2: Sign in to Google and grant permission.\n\n");
  process.stderr.write(
    "Step 3: After authorizing, your browser will redirect to http://localhost\n"
  );
  process.stderr.write(
    "        The page will show an error (connection refused) — that's expected!\n"
  );
  process.stderr.write(
    "        Copy the FULL URL from your browser's address bar and paste it below.\n\n"
  );

  const input = await prompt("Paste the full redirect URL (or just the code): ");

  if (!input) {
    process.stderr.write("\n❌ No input provided. Authorization cancelled.\n");
    process.exit(1);
  }

  const code = extractCode(input);

  process.stderr.write("\nExchanging authorization code for tokens...\n");

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    await authService.storeTokens(tokens);

    process.stderr.write(`\n✅ Authorization complete! Tokens stored at: ${config.google.tokenPath}\n`);
    process.stderr.write("You can now start the MCP server with: npm run dev\n\n");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`\n❌ Token exchange failed: ${message}\n`);
    process.stderr.write("Make sure you pasted the correct URL/code and try again.\n\n");
    process.exit(1);
  }
}

main().catch((err) => {
  process.stderr.write(
    `\n❌ Authorization failed: ${err instanceof Error ? err.message : String(err)}\n`
  );
  process.exit(1);
});
