import "dotenv/config";

/**
 * Application configuration loaded from environment variables.
 * Fails fast at startup if required variables are missing.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Copy .env.example to .env and fill in all required values.`
    );
  }
  return value.trim();
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name]?.trim() || defaultValue;
}

export interface AppConfig {
  google: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    tokenPath: string;
    scopes: string[];
  };
  logging: {
    level: string;
  };
  server: {
    name: string;
    version: string;
  };
}

let _config: AppConfig | null = null;

/**
 * Returns the validated application configuration.
 * Memoized after first load.
 */
export function getConfig(): AppConfig {
  if (_config) return _config;

  _config = {
    google: {
      clientId: requireEnv("GOOGLE_CLIENT_ID"),
      clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
      redirectUri: optionalEnv(
        "GOOGLE_REDIRECT_URI",
        "http://localhost:3000/oauth/callback"
      ),
      tokenPath: optionalEnv("GOOGLE_TOKEN_PATH", "./tokens.json"),
      scopes: [
        "https://www.googleapis.com/auth/gmail.compose",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/documents",
      ],
    },
    logging: {
      level: optionalEnv("LOG_LEVEL", "info"),
    },
    server: {
      name: optionalEnv("MCP_SERVER_NAME", "mcp-google-server"),
      version: optionalEnv("MCP_SERVER_VERSION", "1.0.0"),
    },
  };

  return _config;
}

/** Reset config (for testing). */
export function resetConfig(): void {
  _config = null;
}
