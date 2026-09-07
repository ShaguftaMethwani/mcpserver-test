# MCP Google Server

A **generic, reusable [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server** that lets any MCP-compatible AI agent draft and send Gmail emails and append content to Google Docs — without the agent needing to understand Google's APIs.

```
AI Agent  ──MCP──►  mcp-google-server  ──────►  Gmail API
                                         └───►  Google Docs API
```

## Features

| Tool | Description | Side Effect |
|------|-------------|-------------|
| `gmail_create_draft` | Create a Gmail draft (does NOT send) | None — safe |
| `gmail_send_email` | Send an email via Gmail | ⚠️ Sends immediately |
| `google_docs_append` | Append text to an existing Google Doc | Modifies document |

---

## Prerequisites

- **Node.js 18+**
- A **Google Cloud project** with the Gmail API and Google Docs API enabled
- **OAuth 2.0 credentials** (Desktop app type)

---

## Setup

### 1. Clone and install dependencies

```bash
git clone <your-repo-url> mcp-google-server
cd mcp-google-server
npm install
```

### 2. Create a Google Cloud project and enable APIs

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Enable the following APIs:
   - [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
   - [Google Docs API](https://console.cloud.google.com/apis/library/docs.googleapis.com)

### 3. Create OAuth 2.0 credentials

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth 2.0 Client IDs**
3. Application type: **Desktop app**
4. Download the JSON file

### 4. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/callback
GOOGLE_TOKEN_PATH=./tokens.json
LOG_LEVEL=info
```

> ⚠️ Never commit `.env` or `tokens.json` — they are already in `.gitignore`.

### 5. Authorize with Google

Run the one-time OAuth consent flow:

```bash
npm run auth
```

This will:
1. Print an authorization URL
2. Wait for you to open it in your browser and approve access
3. Ask you to paste the authorization code
4. Store tokens in `tokens.json`

### 6. Start the MCP server

```bash
npm run dev          # Development (with tsx, no build needed)
npm run build && npm start   # Production
```

The server communicates over **stdio** and is now ready for MCP clients to connect.

---

## Connecting an MCP Client

### Claude Desktop

Add the following to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "google": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-google-server/dist/index.js"],
      "env": {
        "GOOGLE_CLIENT_ID": "your-client-id",
        "GOOGLE_CLIENT_SECRET": "your-client-secret",
        "GOOGLE_TOKEN_PATH": "/absolute/path/to/tokens.json"
      }
    }
  }
}
```

### Generic MCP Client (stdio)

```bash
node dist/index.js
```

The server exposes three discoverable tools over stdin/stdout using the MCP protocol.

---

## Tool Documentation

### `gmail_create_draft`

Creates a Gmail draft. **Does not send the email.**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | `string[]` | ✅ | Recipient email addresses |
| `cc` | `string[]` | ❌ | CC recipients |
| `bcc` | `string[]` | ❌ | BCC recipients |
| `subject` | `string` | ✅ | Email subject line |
| `body` | `string` | ✅ | Email body content |
| `body_type` | `"plain"\|"html"` | ❌ | Body content type (default: `"plain"`) |

**Success response:**
```json
{
  "success": true,
  "draft_id": "1234567890abcdef",
  "message": "Draft created successfully."
}
```

**Error response:**
```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_REQUIRED",
    "message": "No Google credentials found. Run `npm run auth` to authorize the server."
  }
}
```

---

### `gmail_send_email`

Sends an email immediately. ⚠️ **This is an irreversible external action.**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | `string[]` | ✅ | Recipient email addresses |
| `cc` | `string[]` | ❌ | CC recipients |
| `bcc` | `string[]` | ❌ | BCC recipients |
| `subject` | `string` | ✅ | Email subject line |
| `body` | `string` | ✅ | Email body content |
| `body_type` | `"plain"\|"html"` | ❌ | Body content type (default: `"plain"`) |

**Success response:**
```json
{
  "success": true,
  "message_id": "18abc123def456",
  "thread_id": "18abc123def456",
  "message": "Email sent successfully."
}
```

---

### `google_docs_append`

Appends text to the end of an existing Google Doc. Existing content is preserved.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `document_id` | `string` | ✅ | The Google Docs document ID (from the URL) |
| `content` | `string` | ✅ | Text to append |
| `add_newline` | `boolean` | ❌ | Prepend a newline before content (default: `false`) |

**Finding the document ID**: In the Google Docs URL `https://docs.google.com/document/d/DOCUMENT_ID/edit`, the `DOCUMENT_ID` is the long alphanumeric string.

**Success response:**
```json
{
  "success": true,
  "document_id": "1AbCdEfGhIjKlMnOpQrStUvWxYz",
  "message": "Content appended successfully."
}
```

**Error codes:**

| Code | Description |
|------|-------------|
| `AUTHENTICATION_REQUIRED` | No credentials or expired token. Run `npm run auth`. |
| `PERMISSION_DENIED` | Insufficient Google API permissions or OAuth scopes. |
| `DOCUMENT_NOT_FOUND` | Document ID is wrong or document is inaccessible. |
| `INVALID_INPUT` | Input validation failed (e.g., invalid email address). |
| `RATE_LIMITED` | Google API rate limit hit. Retry after a short wait. |
| `GOOGLE_API_ERROR` | Unclassified Google API error. |
| `INTERNAL_ERROR` | Unexpected server error. |

---

## Development

```bash
npm run dev          # Start with hot reload
npm test             # Run all tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
npm run lint         # Type-check without emitting
npm run build        # Compile to dist/
```

### Project Structure

```
src/
├── index.ts                    # Entry point
├── server/
│   ├── mcp-server.ts           # MCP server setup
│   └── tool-registry.ts        # Tool registration
├── tools/
│   ├── gmail/                  # Gmail tool handlers + schemas
│   └── google-docs/            # Docs tool handlers + schemas
├── services/                   # Google API wrappers
├── validation/                 # Input validation (Zod)
├── errors/                     # Error codes, McpError, error handler
├── logging/                    # Pino logger with redaction
├── config/                     # Environment config
└── types/                      # TypeScript types
```

### Adding a New Google Service

1. Create `src/tools/<service>/schemas.ts` — Zod input schema
2. Create `src/services/<service>.service.ts` — API wrapper
3. Create `src/tools/<service>/<tool>.tool.ts` — thin handler
4. Register in `src/server/tool-registry.ts`
5. Add the required OAuth scope to `src/config/config.ts`

No changes needed to the core server, transport, or auth layers.

---

## Security

- **Least-privilege OAuth scopes**: only `gmail.compose`, `gmail.send`, and `documents`
- **No secrets in code**: all credentials via environment variables
- **Tokens not logged**: Pino redacts `access_token`, `refresh_token`, `client_secret`
- **Token file permissions**: stored with `0o600` (owner read/write only)
- **No stack traces to clients**: errors are translated to structured codes before returning

---

## License

MIT
