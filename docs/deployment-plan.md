# Railway Deployment Plan — MCP Google Server

## Overview

The server currently runs on **stdio** transport (spawned as a local subprocess).
Railway is a cloud platform that exposes services over **HTTPS**, so the MCP
server must be migrated to **Streamable HTTP** transport before deploying.
Everything else — the service layer, tools, auth, and config — stays exactly as-is.

---

## Key Problem: stdio → HTTP Transport

| | Local (`stdio`) | Railway (`Streamable HTTP`) |
|---|---|---|
| Transport | `StdioServerTransport` | `StreamableHTTPServerTransport` |
| Connection | Local process pipe | Public HTTPS URL |
| Entry point | `src/index.ts` | `src/server-http.ts` (new) |
| Port | n/a | `process.env.PORT` (Railway injects this) |
| Client config | `"command": "tsx ..."` | `"url": "https://...railway.app/mcp"` |

---

## Critical Decision: OAuth Tokens on Railway

> [!IMPORTANT]
> `tokens.json` is in `.gitignore` — it will **NOT** be deployed automatically.
> Railway is stateless (ephemeral filesystem), so writing a refreshed token back to a file would be lost on the next deploy or restart.

**Chosen strategy — env var `GOOGLE_TOKENS_JSON`:**

Store the entire `tokens.json` content as a single Railway environment variable.
The auth service will be updated to read from it when `GOOGLE_TOKEN_PATH` is not set.
On token refresh, the new credentials are written back to the env var in-memory
(sufficient for the lifetime of the process; a full token-refresh persistence
solution with a DB can be added later if needed).

---

## Proposed Changes

### 1. New Files

---

#### [NEW] `src/server-http.ts` — HTTP entry point

Replaces `src/index.ts` for cloud deployments. Uses `StreamableHTTPServerTransport`
and an Express HTTP server listening on `PORT`.

```typescript
import "dotenv/config";
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { getConfig } from "./config/config.js";
import { createMcpServer } from "./server/mcp-server.js";
import { logger } from "./logging/logger.js";

const app = express();
app.use(express.json());

const config = getConfig();
const mcpServer = createMcpServer(config);

app.post("/mcp", async (req, res) => {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await mcpServer.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => logger.info(`MCP HTTP server listening on port ${PORT}`));
```

---

#### [NEW] `railway.json` — Railway service config

Tells Railway which build and start commands to use.

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node dist/server-http.js",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

---

### 2. Modified Files

---

#### [MODIFY] [`package.json`](file:///Users/shaguftagurmukhdas/Downloads/mcpserver/package.json)

Add `express` as a dependency and a `start:http` script.

```diff
+   "start:http": "node dist/server-http.js",
    "start": "node dist/index.js",
```

```diff
 "dependencies": {
+    "express": "^4.21.0",
     "@modelcontextprotocol/sdk": "^1.12.3",
```

Also add `@types/express` to `devDependencies`.

---

#### [MODIFY] [`tsconfig.json`](file:///Users/shaguftagurmukhdas/Downloads/mcpserver/tsconfig.json)

Change `moduleResolution` from `bundler` to `node16` so the compiled JS resolves
correctly at runtime without a bundler.

```diff
-  "moduleResolution": "bundler",
+  "moduleResolution": "node16",
+  "module": "Node16",
```

---

#### [MODIFY] [`src/services/google-auth.service.ts`](file:///Users/shaguftagurmukhdas/Downloads/mcpserver/src/services/google-auth.service.ts)

Update `loadStoredTokens()` to also read from the `GOOGLE_TOKENS_JSON` env var
when no token file exists (the Railway case):

```typescript
async loadStoredTokens(): Promise<Credentials | null> {
  // 1. Try file first (local dev)
  try {
    await access(this.tokenPath, constants.F_OK);
    const raw = await readFile(this.tokenPath, "utf-8");
    return JSON.parse(raw) as Credentials;
  } catch { /* fall through */ }

  // 2. Fall back to env var (Railway / CI)
  const envTokens = process.env.GOOGLE_TOKENS_JSON;
  if (envTokens) {
    try {
      return JSON.parse(envTokens) as Credentials;
    } catch {
      logger.error("GOOGLE_TOKENS_JSON is set but is not valid JSON.");
    }
  }

  return null;
}
```

---

#### [MODIFY] [`.gitignore`](file:///Users/shaguftagurmukhdas/Downloads/mcpserver/.gitignore)

Make sure `dist/` stays ignored (already is) and add Railway-specific ignores:

```diff
+# Railway
+.railway/
```

---

### 3. New Environment Variables for Railway Dashboard

| Variable | Value | Notes |
|---|---|---|
| `GOOGLE_CLIENT_ID` | `277611435729-...` | Copy from `.env` |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` | Copy from `.env` |
| `GOOGLE_REDIRECT_URI` | `http://localhost` | Keep same — only used for re-auth |
| `GOOGLE_TOKENS_JSON` | _(contents of `tokens.json`)_ | Paste the full JSON as a single value |
| `LOG_LEVEL` | `info` | |
| `MCP_SERVER_NAME` | `mcp-google-server` | |
| `MCP_SERVER_VERSION` | `1.0.0` | |

> [!WARNING]
> `tokens.json` contains your **refresh token**. Treat `GOOGLE_TOKENS_JSON` as a
> secret — use Railway's **Sealed Variables** feature for it in production.

---

## Step-by-Step Deployment Checklist

### Phase 1 — Code Changes (local)

- [ ] Install `express` and `@types/express`
- [ ] Create `src/server-http.ts`
- [ ] Update `src/services/google-auth.service.ts` to read `GOOGLE_TOKENS_JSON`
- [ ] Update `tsconfig.json` module resolution
- [ ] Update `package.json` scripts and dependencies
- [ ] Create `railway.json`
- [ ] Run `npm run build` — verify `dist/server-http.js` is emitted
- [ ] Run `npm test` — all 40 tests still pass
- [ ] Test locally: `node dist/server-http.js` → `curl http://localhost:3000/health`

### Phase 2 — GitHub

- [ ] Create a GitHub repository (if not already done)
- [ ] Push all code (`tokens.json` must NOT be committed — verify `.gitignore`)

### Phase 3 — Railway Setup

- [ ] Log in at [railway.app](https://railway.app)
- [ ] New Project → Deploy from GitHub Repo → select your repo
- [ ] In **Variables** tab, add all env vars from the table above
- [ ] Paste the contents of your local `tokens.json` as `GOOGLE_TOKENS_JSON` (seal it)
- [ ] Railway auto-detects Node.js and runs `npm run build` then `npm start`
  - Or: override Start Command to `node dist/server-http.js`
- [ ] Wait for deploy — check logs for `MCP HTTP server listening on port ...`
- [ ] Visit `https://<your-service>.up.railway.app/health` → should return `{"status":"ok"}`

### Phase 4 — Connect Your MCP Client

Update your Claude / Cursor / other MCP client config:

```json
{
  "mcpServers": {
    "mcp-google-server": {
      "url": "https://<your-service>.up.railway.app/mcp"
    }
  }
}
```

### Phase 5 — Smoke Test on Railway

- [ ] Run `npm run smoke` locally but pointed at the Railway URL (or test via your MCP client)
- [ ] Verify a Gmail draft can be created
- [ ] Verify a Google Doc can have content appended

---

## Open Questions

> [!IMPORTANT]
> **Token refresh persistence**: When Railway restarts the container, the in-memory
> refreshed token is lost. For now, the refresh token in `GOOGLE_TOKENS_JSON` is
> long-lived and will be used to get a new access token on each cold start —
> this is acceptable. If you want full persistence, we can add a Redis or
> Railway-provisioned Postgres to store tokens. Do you want this now or later?

> [!NOTE]
> **Re-authorization**: If you ever need to re-run `npm run auth`, you'll need to
> do it locally (the OAuth redirect goes to `http://localhost`) and then paste
> the new `tokens.json` into the Railway `GOOGLE_TOKENS_JSON` variable again.
> This is a one-time manual step per re-authorization.

---

## Verification Plan

| Check | Command / Method |
|---|---|
| Build passes | `npm run build` |
| Tests pass | `npm test` |
| Health endpoint | `curl https://<service>.up.railway.app/health` |
| MCP tools reachable | Connect Claude/Cursor to the Railway URL |
| Gmail draft works | Create draft via MCP client |
| Docs append works | Append to a doc via MCP client |
