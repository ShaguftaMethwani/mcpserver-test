import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GoogleAuthService } from "../../../src/services/google-auth.service.js";
import { ErrorCode } from "../../../src/errors/error-codes.js";

// Mock the file system operations
vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn().mockResolvedValue(undefined),
  access: vi.fn(),
  constants: { F_OK: 0 },
}));

// Mock googleapis
vi.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(() => ({
        on: vi.fn(),
        setCredentials: vi.fn(),
        generateAuthUrl: vi.fn().mockReturnValue("https://accounts.google.com/o/oauth2/auth?mock"),
        getToken: vi.fn().mockResolvedValue({ tokens: { access_token: "mock_access", refresh_token: "mock_refresh" } }),
        refreshAccessToken: vi.fn().mockResolvedValue({
          credentials: { access_token: "new_access_token", expiry_date: Date.now() + 3600000 },
        }),
      })),
    },
  },
}));

const mockConfig = {
  google: {
    clientId: "test-client-id",
    clientSecret: "test-client-secret",
    redirectUri: "http://localhost:3000/oauth/callback",
    tokenPath: "./test-tokens.json",
    scopes: ["https://www.googleapis.com/auth/gmail.send"],
  },
  logging: { level: "silent" },
  server: { name: "test", version: "1.0.0" },
};

describe("GoogleAuthService", () => {
  let authService: GoogleAuthService;

  beforeEach(() => {
    authService = new GoogleAuthService(mockConfig as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("loadStoredTokens", () => {
    it("returns null if token file does not exist", async () => {
      const { access } = await import("fs/promises");
      vi.mocked(access).mockRejectedValue(new Error("ENOENT"));

      const tokens = await authService.loadStoredTokens();
      expect(tokens).toBeNull();
    });

    it("returns parsed tokens if file exists", async () => {
      const { access, readFile } = await import("fs/promises");
      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({ access_token: "test_token", refresh_token: "test_refresh" }) as any
      );

      const tokens = await authService.loadStoredTokens();
      expect(tokens).not.toBeNull();
      expect(tokens?.access_token).toBe("test_token");
    });
  });

  describe("getAuthenticatedClient", () => {
    it("throws AUTHENTICATION_REQUIRED when no tokens are stored", async () => {
      const { access } = await import("fs/promises");
      vi.mocked(access).mockRejectedValue(new Error("ENOENT"));

      await expect(authService.getAuthenticatedClient()).rejects.toMatchObject({
        code: ErrorCode.AUTHENTICATION_REQUIRED,
      });
    });

    it("returns the OAuth2 client when valid tokens exist", async () => {
      const { access, readFile } = await import("fs/promises");
      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          access_token: "valid_token",
          refresh_token: "refresh_token",
          expiry_date: Date.now() + 3600000, // valid for 1 hour
        }) as any
      );

      const client = await authService.getAuthenticatedClient();
      expect(client).toBeDefined();
    });
  });
});
