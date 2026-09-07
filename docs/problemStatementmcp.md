# Problem Statement: Generic Gmail + Google Docs MCP Server

## 1. Objective

Build a **generic, reusable Model Context Protocol (MCP) server** that exposes two core capabilities to AI agents:

1. **Gmail email operations**
   - Draft an email
   - Send an email

2. **Google Docs operations**
   - Append content to an existing Google Doc

The MCP server must **not be tightly coupled to a single AI agent, agent framework, or application**. Any MCP-compatible AI agent/client should be able to discover and use the exposed tools.

The primary goal is to provide a clean abstraction over Gmail and Google Docs APIs so that an AI agent can perform these actions through MCP without needing to directly understand or implement Google's APIs.

---

## 2. Scope

### In Scope

#### Gmail
- Authenticate with a Google account using OAuth 2.0.
- Create email drafts.
- Send emails.
- Support standard email fields:
  - `to`
  - `cc`
  - `bcc`
  - `subject`
  - `body`
- Support plain-text email bodies at minimum.
- Prefer support for HTML email bodies where practical.
- Return structured success/error responses.
- Ensure the agent can distinguish between:
  - draft created successfully
  - email sent successfully
  - operation failed

#### Google Docs
- Authenticate with a Google account using OAuth 2.0.
- Accept a Google Docs document ID.
- Append text/content to the end of the specified document.
- Return structured success/error responses.
- Preserve the existing document content.
- Do not overwrite or truncate existing content.

### Out of Scope for Initial Version

Do not implement these unless required by the architecture:

- Gmail inbox/search/read functionality
- Email deletion
- Email labels
- Attachments
- Thread management
- Google Drive file management
- Google Sheets
- Google Slides
- Arbitrary Google Docs editing
- Formatting individual portions of an existing document
- Creating new Google Docs
- Managing multiple Google accounts simultaneously
- AI-generated email/document content

The MCP server should focus on being a reliable **action layer**. The AI agent remains responsible for deciding what content to generate.

---

## 3. MCP Requirements

The server must follow the **Model Context Protocol** and expose the functionality as MCP tools.

The implementation should be compatible with standard MCP clients rather than relying on any proprietary agent implementation.

### Design Principles

- Tool names should be descriptive and provider-oriented.
- Tool descriptions must clearly explain what each tool does.
- Every tool must have a well-defined input schema.
- Input schemas should use explicit types and required/optional fields.
- Responses should be structured and machine-readable where possible.
- Errors should be actionable and understandable to an AI agent.
- Avoid exposing Google API implementation details unnecessarily.
- The server should be stateless with respect to individual AI-agent conversations.
- Authentication/session state should be handled separately from tool invocation.

---

## 4. Proposed MCP Tools

The initial MCP server should expose at least these tools.

### Tool 1: `gmail_create_draft`

Creates a Gmail draft without sending it.

#### Input

```json
{
  "to": ["recipient@example.com"],
  "cc": ["optional@example.com"],
  "bcc": ["optional@example.com"],
  "subject": "Email subject",
  "body": "Email body",
  "body_type": "plain"
}
```

#### Input Requirements

- `to`: required array of valid email addresses.
- `cc`: optional array.
- `bcc`: optional array.
- `subject`: required string.
- `body`: required string.
- `body_type`: optional enum:
  - `plain`
  - `html`
- Validate email addresses before making the Gmail API call.

#### Response

Example:

```json
{
  "success": true,
  "draft_id": "1234567890",
  "message": "Draft created successfully."
}
```

Do not expose unnecessary Gmail API response data.

---

### Tool 2: `gmail_send_email`

Sends an email through Gmail.

#### Input

```json
{
  "to": ["recipient@example.com"],
  "cc": [],
  "bcc": [],
  "subject": "Email subject",
  "body": "Email body",
  "body_type": "plain"
}
```

#### Input Requirements

Same validation requirements as `gmail_create_draft`.

#### Response

Example:

```json
{
  "success": true,
  "message_id": "abc123",
  "thread_id": "xyz789",
  "message": "Email sent successfully."
}
```

The response should provide enough information for the AI agent to confirm that the operation succeeded.

---

### Tool 3: `google_docs_append`

Appends content to the end of an existing Google Doc.

#### Input

```json
{
  "document_id": "1AbCdEfGhIjKlMnOp",
  "content": "Content to append"
}
```

Optional future parameters may include:

```json
{
  "document_id": "1AbCdEfGhIjKlMnOp",
  "content": "Content to append",
  "add_newline": true
}
```

#### Requirements

- `document_id` is required.
- `content` is required.
- Fetch the document's current structure/version as required by the Google Docs API.
- Determine the correct insertion index at the end of the document.
- Append the supplied content without modifying existing content.
- Handle documents containing multiple structural elements.
- Handle the terminating newline/index requirements of the Google Docs API correctly.
- Avoid accidentally inserting content before the final newline or corrupting document structure.

#### Response

Example:

```json
{
  "success": true,
  "document_id": "1AbCdEfGhIjKlMnOp",
  "message": "Content appended successfully."
}
```

---

## 5. Authentication

Use **Google OAuth 2.0**.

The server needs the appropriate Google API scopes.

At minimum, evaluate the following scopes:

### Gmail

- `https://www.googleapis.com/auth/gmail.compose` for draft creation.
- `https://www.googleapis.com/auth/gmail.send` for sending.

If a single broader scope is technically required by the chosen implementation, document why.

### Google Docs

- `https://www.googleapis.com/auth/documents`

Use the **least-privilege scopes possible**.

### Credential Handling

- Never hard-code client IDs, client secrets, access tokens, or refresh tokens.
- Store secrets in environment variables or a secure secret mechanism.
- Do not log access tokens or refresh tokens.
- Do not expose credentials through MCP responses.
- Refresh expired access tokens automatically when possible.
- Fail gracefully when re-authentication is required.

Expected configuration should look conceptually like:

```text
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
GOOGLE_TOKEN_STORAGE=
```

The exact configuration mechanism can be decided during implementation.

---

## 6. Authorization Model

The initial implementation can assume a single authenticated Google account per server instance.

However, the architecture should not make multi-user support impossible later.

Separate the following concepts:

```text
MCP Client
    ↓
MCP Server
    ↓
Authentication / Credential Manager
    ↓
Google API Client
    ├── Gmail API
    └── Google Docs API
```

The tools themselves should not contain authentication logic.

---

## 7. Architecture

Use a layered architecture.

Recommended structure:

```text
mcp-server/
│
├── src/
│   ├── server/
│   │   ├── mcp-server
│   │   └── tool-registration
│   │
│   ├── tools/
│   │   ├── gmail/
│   │   │   ├── create-draft
│   │   │   └── send-email
│   │   │
│   │   └── google-docs/
│   │       └── append-content
│   │
│   ├── services/
│   │   ├── gmail-service
│   │   ├── google-docs-service
│   │   └── google-auth-service
│   │
│   ├── validation/
│   │   └── input-validation
│   │
│   └── config/
│       └── configuration
│
├── tests/
├── .env.example
├── README.md
└── problemStatement.md
```

The exact language/framework is open to implementation choice, but the implementation should use a mature MCP SDK and official Google API client libraries.

---

## 8. Separation of Concerns

### MCP Layer

Responsible for:

- Registering MCP tools.
- Defining tool schemas.
- Receiving tool calls.
- Returning MCP-compatible responses.
- Translating internal errors into useful tool errors.

### Service Layer

Responsible for:

- Gmail API operations.
- Google Docs API operations.
- Google-specific implementation details.

### Authentication Layer

Responsible for:

- OAuth flow.
- Token storage/retrieval.
- Token refresh.
- Authentication errors.

### Validation Layer

Responsible for:

- Input validation.
- Email address validation.
- Required fields.
- Document ID/content validation.
- Reasonable input limits.

This separation is important because the server should remain reusable by different AI agents.

---

## 9. Generic AI-Agent Compatibility

The server must not assume that the calling agent is:

- OpenAI-based
- Anthropic-based
- Google-based
- LangChain-based
- LangGraph-based
- AutoGen-based
- Custom-built

The only contract between the agent and server should be MCP.

For example, an AI agent should be able to discover:

```text
gmail_create_draft
gmail_send_email
google_docs_append
```

and infer from the tool schemas and descriptions how to invoke them.

Avoid agent-specific instructions such as:

```text
If OpenAI agent asks X, do Y.
```

Instead, use clear tool descriptions such as:

```text
Creates a Gmail draft using the authenticated Google account.
The email is saved as a draft and is NOT sent.
```

---

## 10. Safety and Confirmation Considerations

Sending an email is an externally visible action and should be treated differently from drafting.

The MCP server should make this distinction explicit:

### Draft

`gmail_create_draft`

- Creates a draft.
- Does not send anything.
- Safe for an agent to use when the user asks to prepare/write an email.

### Send

`gmail_send_email`

- Causes an external side effect.
- Sends an actual email.
- Tool description should clearly state that the operation sends the email immediately.

The MCP server itself does not need to implement an AI confirmation policy, but its API should make the side effect obvious.

For example:

```text
gmail_create_draft:
"Create a Gmail draft. This does not send the email."

gmail_send_email:
"Send an email immediately using Gmail. This performs an external side effect."
```

---

## 11. Error Handling

Errors must be useful to both developers and AI agents.

Handle at least:

### Authentication Errors

Examples:

- No Google credentials configured.
- Access token expired and cannot be refreshed.
- OAuth authorization required.
- Insufficient Google API permissions.

Example response:

```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_REQUIRED",
    "message": "Google authentication is required before using this tool."
  }
}
```

### Validation Errors

Example:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "The 'to' field must contain at least one valid email address."
  }
}
```

### Google API Errors

Translate Google API errors into meaningful categories where practical.

For example:

- `AUTHENTICATION_REQUIRED`
- `PERMISSION_DENIED`
- `DOCUMENT_NOT_FOUND`
- `INVALID_DOCUMENT`
- `RATE_LIMITED`
- `GOOGLE_API_ERROR`

Do not expose raw stack traces to the AI agent.

Detailed stack traces can be logged server-side during development.

---

## 12. Logging

Implement structured logging.

Logs should include useful metadata such as:

```text
timestamp
tool_name
operation
success/failure
error_code
request/correlation_id
```

Never log:

- OAuth access tokens
- Refresh tokens
- Client secrets
- Full email bodies
- Sensitive document content

Prefer logging metadata rather than user content.

---

## 13. Configuration

Provide a `.env.example`.

Example:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
GOOGLE_TOKEN_PATH=
LOG_LEVEL=info
```

Do not commit real credentials.

Add appropriate entries to `.gitignore`.

---

## 14. Transport

The MCP server should support a standard MCP transport suitable for local AI-agent usage.

For the initial version, prioritize:

- **stdio transport** for local MCP clients.

If the chosen MCP SDK makes it straightforward, structure the application so HTTP/SSE/streamable HTTP transport can be added later without rewriting the tool/service layers.

Do not tightly couple business logic to the transport implementation.

---

## 15. Testing

Provide automated tests.

### Unit Tests

Test:

- Email input validation.
- Gmail message construction.
- Draft request construction.
- Send request construction.
- Google Docs append index calculation.
- Error translation.
- Authentication error handling.

### Integration Tests

Where practical, provide tests using mocked Google APIs.

Do not require a real Google account for the normal test suite.

If real API integration tests are included, keep them separately marked and require explicit configuration.

---

## 16. README Requirements

Create a comprehensive `README.md` explaining:

### What the server does

Example:

```text
A generic MCP server that lets MCP-compatible AI agents
draft/send Gmail emails and append content to Google Docs.
```

### Features

- Gmail draft creation
- Gmail email sending
- Google Docs append
- OAuth 2.0 authentication
- MCP-compatible tools

### Setup

Explain:

1. Creating/configuring a Google Cloud project.
2. Enabling:
   - Gmail API
   - Google Docs API
3. Creating OAuth credentials.
4. Configuring environment variables.
5. Running the OAuth authorization flow.
6. Starting the MCP server.
7. Connecting an MCP-compatible AI client.

### Tool Documentation

Document each MCP tool with:

- Name
- Description
- Inputs
- Required/optional parameters
- Example invocation
- Expected response
- Common errors

### MCP Client Example

Provide at least one generic example showing how an MCP client would configure the server.

Do not make the implementation dependent on that client.

---

## 17. Developer Experience

The project should be easy for another developer to clone and run.

Provide:

```text
.env.example
README.md
package/dependency configuration
source code
tests
```

Depending on the selected language, include appropriate commands such as:

```text
install dependencies
run development server
run tests
build
start production server
```

The final implementation should have no undocumented manual steps.

---

## 18. Non-Functional Requirements

### Reliability

Google API failures should not crash the MCP server.

A failed tool invocation should return an error while keeping the MCP server available for subsequent requests.

### Security

- Least-privilege OAuth scopes.
- No secrets in source control.
- No credentials in logs.
- Validate all tool inputs.
- Do not trust arbitrary input as safe HTML without appropriate handling.
- Keep authentication isolated from business logic.

### Maintainability

Use clear abstractions so additional Google services can later be added:

```text
Google Calendar
Google Sheets
Google Drive
Google Tasks
```

without changing the core MCP architecture.

### Extensibility

Future tools should be addable by implementing:

```text
MCP tool
    ↓
Service abstraction
    ↓
Google API client
```

rather than modifying existing Gmail/Docs functionality.

---

## 19. Expected User Flow

A typical flow should look like:

### Email Draft

```text
User
  ↓
AI Agent
  ↓
MCP: gmail_create_draft
  ↓
MCP Server
  ↓
Google Auth
  ↓
Gmail API
  ↓
Draft created
  ↓
MCP response
  ↓
AI Agent
```

### Email Send

```text
User
  ↓
AI Agent
  ↓
MCP: gmail_send_email
  ↓
MCP Server
  ↓
Google Auth
  ↓
Gmail API
  ↓
Email sent
  ↓
MCP response
```

### Append to Google Doc

```text
User
  ↓
AI Agent
  ↓
MCP: google_docs_append
  ↓
MCP Server
  ↓
Google Auth
  ↓
Google Docs API
  ↓
Content appended
  ↓
MCP response
```

---

## 20. Example Agent Interactions

The MCP server should enable interactions such as:

### Example 1

User:

> Draft an email to john@example.com saying that the meeting has been moved to 4 PM.

Agent:

```text
gmail_create_draft(
  to=["john@example.com"],
  subject="Meeting Time Update",
  body="The meeting has been moved to 4 PM."
)
```

Expected result:

```text
Draft created successfully.
```

### Example 2

User:

> Send an email to John telling him the report is ready.

Agent:

```text
gmail_send_email(
  to=["john@example.com"],
  subject="Report Ready",
  body="The report is ready."
)
```

Expected result:

```text
Email sent successfully.
```

### Example 3

User:

> Add these meeting notes to the Google Doc.

Agent:

```text
google_docs_append(
  document_id="DOCUMENT_ID",
  content="Meeting notes..."
)
```

Expected result:

```text
Content appended successfully.
```

---

## 21. Acceptance Criteria

The implementation is complete when all of the following are true:

### MCP

- [ ] Server implements the MCP protocol correctly.
- [ ] Tools are discoverable by a generic MCP client.
- [ ] Tool schemas are explicit and valid.
- [ ] Server does not depend on a specific AI agent/framework.
- [ ] stdio transport works for local MCP usage.

### Gmail

- [ ] User can authenticate with Google.
- [ ] `gmail_create_draft` creates a real Gmail draft.
- [ ] `gmail_send_email` sends a real email.
- [ ] To/CC/BCC are supported.
- [ ] Subject and body are supported.
- [ ] Plain-text email works.
- [ ] HTML email is supported if implemented.
- [ ] Invalid email input is rejected cleanly.
- [ ] Gmail API errors are handled gracefully.

### Google Docs

- [ ] User can authenticate with Google.
- [ ] `google_docs_append` appends content to a specified document.
- [ ] Existing document content remains unchanged.
- [ ] Appending works correctly with the Google Docs document structure.
- [ ] Missing/inaccessible documents return useful errors.
- [ ] Google Docs API errors are handled gracefully.

### Security

- [ ] No secrets are committed.
- [ ] Tokens are not logged.
- [ ] OAuth scopes follow least privilege.
- [ ] Sensitive email/document content is not logged by default.

### Quality

- [ ] Unit tests exist.
- [ ] API interactions are testable with mocks.
- [ ] README contains complete setup instructions.
- [ ] `.env.example` is included.
- [ ] Project can be installed and run from a clean environment.

---

## 22. Implementation Guidance

Before writing substantial code:

1. Inspect the latest stable MCP SDK for the selected implementation language.
2. Confirm the recommended MCP server/tool registration pattern.
3. Use official Google API client libraries.
4. Confirm the exact Gmail and Google Docs API request/response formats.
5. Confirm OAuth scope requirements.
6. Design the authentication flow before implementing the tools.
7. Keep MCP-specific code separate from Google API service code.

Do not over-engineer the first version.

The priority is:

**Reliable MCP server → clean tool schemas → secure Google authentication → Gmail actions → Google Docs append → tests → documentation.**

---

## 23. Deliverables

The final repository should contain:

```text
mcp-google-server/
├── src/
├── tests/
├── .env.example
├── .gitignore
├── README.md
├── package/dependency configuration
└── problemStatement.md
```

The implementation should be production-minded but simple enough to understand and extend.

The most important architectural requirement is:

> **Build a generic MCP server, not an AI-agent-specific integration.**

Any MCP-compatible AI agent should be able to connect to the server, discover the Gmail and Google Docs tools, understand their schemas, and invoke them using the standard MCP interface.
