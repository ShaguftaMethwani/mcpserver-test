import { google } from "googleapis";
import { OAuth2Client, Credentials } from "google-auth-library";
import { readFile, writeFile, access, constants } from "fs/promises";
import * as readline from "readline";
import { AppConfig } from "../config/config.js";
import { logger } from "../logging/logger.js";
import { McpError } from "../errors/mcp-error.js";
import { ErrorCode } from "../errors/error-codes.js";

/**
 * Manages Google OAuth 2.0 authentication lifecycle:
 * - First-time authorization flow (generates consent URL, exchanges code for tokens)
 * - Token persistence (file-based storage)
 * - Automatic token refresh when access tokens expire
 *
 * Services receive this class via constructor injection,
 * making them independently testable with mock implementations.
 */
export class GoogleAuthService {
  private readonly oauth2Client: OAuth2Client;
  private readonly tokenPath: string;
  private readonly scopes: string[];

  constructor(config: AppConfig) {
    this.tokenPath = config.google.tokenPath;
    this.scopes = config.google.scopes;

    this.oauth2Client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri
    );

    // Automatically refresh access tokens when they expire
    this.oauth2Client.on("tokens", (tokens) => {
      if (tokens.refresh_token) {
        // New refresh token issued — persist it
        logger.info("New refresh token received; updating stored credentials.");
        this.mergeAndStoreTokens(tokens).catch((err) => {
          logger.error({ error: String(err) }, "Failed to persist new refresh token.");
        });
      }
    });
  }

  /**
   * Returns an authenticated OAuth2 client ready for use with Google APIs.
   * Loads stored tokens and refreshes the access token if expired.
   *
   * @throws {McpError} AUTHENTICATION_REQUIRED if no tokens are stored and authorization is needed.
   */
  async getAuthenticatedClient(): Promise<OAuth2Client> {
    const tokens = await this.loadStoredTokens();

    if (!tokens) {
      throw new McpError(
        ErrorCode.AUTHENTICATION_REQUIRED,
        "No Google credentials found. Run `npm run auth` to authorize the server."
      );
    }

    this.oauth2Client.setCredentials(tokens);

    // Proactively refresh if the access token is expired or close to expiry (within 5 minutes)
    const expiryDate = tokens.expiry_date;
    const isExpiredOrClose =
      !expiryDate || expiryDate <= Date.now() + 5 * 60 * 1000;

    if (isExpiredOrClose && tokens.refresh_token) {
      logger.info("Access token expired or expiring soon; refreshing.");
      try {
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        this.oauth2Client.setCredentials(credentials);
        await this.storeTokens(credentials);
        logger.info("Access token refreshed and stored.");
      } catch (err) {
        logger.error({ error: String(err) }, "Failed to refresh access token.");
        throw new McpError(
          ErrorCode.TOKEN_EXPIRED,
          "Your Google access token has expired and could not be refreshed. Run `npm run auth` to re-authorize."
        );
      }
    }

    return this.oauth2Client;
  }

  /**
   * Runs the interactive OAuth 2.0 consent flow.
   * Prints the authorization URL to stderr and waits for the user to paste the code.
   * Stores the resulting tokens for future use.
   *
   * This method is called by the standalone `npm run auth` script — not during normal MCP operation.
   */
  async authorize(): Promise<void> {
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: this.scopes,
      prompt: "consent", // force refresh token to be issued
    });

    process.stderr.write("\n=== Google OAuth Authorization ===\n");
    process.stderr.write("Open this URL in your browser:\n\n");
    process.stderr.write(authUrl + "\n\n");
    process.stderr.write("After authorizing, paste the code here: ");

    const code = await this.promptForCode();
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    await this.storeTokens(tokens);

    logger.info("Authorization successful. Tokens stored.");
    process.stderr.write("\nAuthorization successful! Tokens stored.\n");
  }

  /**
   * Loads stored OAuth tokens from the configured token file.
   * Falls back to the GOOGLE_TOKENS_JSON environment variable when no token
   * file exists — this is the strategy used on Railway and other cloud platforms
   * where the filesystem is ephemeral and tokens.json cannot be persisted.
   *
   * Returns null if neither source is available.
   */
  async loadStoredTokens(): Promise<Credentials | null> {
    // 1. Try token file first (local development)
    try {
      await access(this.tokenPath, constants.F_OK);
      const raw = await readFile(this.tokenPath, "utf-8");
      return JSON.parse(raw) as Credentials;
    } catch { /* no file — fall through */ }

    // 2. Fall back to env var (Railway / CI / cloud)
    const envTokens = process.env.GOOGLE_TOKENS_JSON;
    if (envTokens) {
      try {
        logger.info("Loading OAuth tokens from GOOGLE_TOKENS_JSON environment variable.");
        return JSON.parse(envTokens) as Credentials;
      } catch {
        logger.error("GOOGLE_TOKENS_JSON is set but contains invalid JSON. Cannot load tokens.");
      }
    }

    return null;
  }

  /**
   * Persists OAuth tokens to the configured token file.
   * The token file should be in .gitignore and have restrictive filesystem permissions.
   */
  async storeTokens(tokens: Credentials): Promise<void> {
    await writeFile(this.tokenPath, JSON.stringify(tokens, null, 2), {
      mode: 0o600, // owner read/write only
      encoding: "utf-8",
    });
  }

  /**
   * Merges new tokens with existing stored tokens (preserving refresh_token if not re-issued).
   */
  private async mergeAndStoreTokens(newTokens: Credentials): Promise<void> {
    const existing = await this.loadStoredTokens();
    const merged: Credentials = {
      ...existing,
      ...newTokens,
      // Preserve existing refresh_token if the new response didn't include one
      refresh_token: newTokens.refresh_token ?? existing?.refresh_token,
    };
    await this.storeTokens(merged);
  }

  /** Reads a line from stdin (used during the interactive auth flow). */
  private promptForCode(): Promise<string> {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stderr,
      });
      rl.once("line", (line) => {
        rl.close();
        resolve(line.trim());
      });
    });
  }
}
