# CodeGuardians

### Autonomous Security Analysis for JavaScript & TypeScript Pull Requests

**CodeGuardians** is a zero-cost CI/CD security analysis tool that scans JavaScript and TypeScript code changes, detects security-sensitive coding patterns through Abstract Syntax Tree (AST) analysis, and delivers actionable diagnostics directly to GitHub pull requests.

Built with TypeScript, Babel, GitHub Apps, Next.js, and Neon PostgreSQL, CodeGuardians integrates security feedback into the code review workflow without requiring a paid scanning platform.

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-Strict_Mode-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Next.js-App_Router-000000?logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/Database-Neon_PostgreSQL-00E599?logo=postgresql&logoColor=black" alt="Neon PostgreSQL" />
  <img src="https://img.shields.io/badge/Deployment-Vercel-000000?logo=vercel&logoColor=white" alt="Vercel" />
  <img src="https://img.shields.io/badge/Parser-Babel-F9DC3E?logo=babel&logoColor=black" alt="Babel" />
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT License" />
</p>

---

## Overview

Security issues often enter production through ordinary code changes: hardcoded credentials, unsafe dynamic execution, or sensitive environment variables exposed through application logs.

CodeGuardians automates an initial layer of security review by analyzing pull request changes and publishing structured findings where developers already collaborate.

### Core capabilities

- **AST-based static analysis** — inspect code structure rather than relying on naive text matching.
- **Pull request integration** — receive GitHub webhook events and publish automated Markdown diagnostics.
- **Targeted security rules** — detect hardcoded secrets, unsafe evaluation, and potential environment-variable leaks.
- **Audit telemetry** — persist scan outcomes and findings in PostgreSQL.
- **Monitoring dashboard** — visualize scan activity, security findings, and repository-level activity with navigable links.
- **Serverless deployment** — use Next.js and Vercel with Neon Serverless PostgreSQL to target a zero-cost infrastructure footprint within applicable free-tier limits.

CodeGuardians is designed as a focused, extensible security layer for JavaScript and TypeScript repositories, not as a replacement for comprehensive SAST, dependency auditing, secret-scanning services, or manual security reviews.

## Why AST Instead of Regex?

Regex-based scanners search source code as text. This can work for simple cases, but source code is a structured language: the same text can represent executable code, a comment, a string, or an entirely different syntactic construct.

CodeGuardians uses `@babel/parser`, `@babel/traverse`, and `@babel/types` to inspect the program's syntactic structure.

| Concern | Naive regex matching | AST-based analysis |
|---|---|---|
| Comments and strings | Can report text that is not executable code | Can distinguish comments, literals, and executable expressions |
| Function calls | May match a function name in unrelated contexts | Can identify `CallExpression` and `NewExpression` nodes |
| Assignments | Often depends on fragile textual patterns | Can inspect `AssignmentExpression` and `VariableDeclarator` nodes |
| Syntax variations | Sensitive to whitespace and formatting | Operates on parsed syntax independent of formatting |
| Context | Limited structural understanding | Can inspect surrounding nodes and parent-child relationships |
| Extensibility | Rules tend to accumulate complex patterns | Rules can target explicit node types and structural relationships |

### Example: Detecting unsafe evaluation

A text-based scanner might search for the word `eval`. That can generate false positives when the word appears in comments, strings, or property names.

An AST-based rule can target a direct call expression:

```ts
eval(userInput);
```

Conceptually, the rule inspects a `CallExpression` and checks whether its callee represents the global `eval` identifier.

It can distinguish that structure from unrelated text:

```ts
// eval(userInput) should not execute
const message = "eval(userInput)";
```

Similarly, a rule targeting dynamic function construction can inspect `NewExpression` nodes for the `Function` constructor.

### Scope-aware analysis

AST traversal provides the structural foundation for scope-aware rules. For example, identifying whether an `eval` identifier is shadowed by a local binding requires binding and scope analysis beyond checking the node's name.

CodeGuardians should treat such cases explicitly in its rule implementation rather than assuming that every syntactically matching identifier necessarily refers to the global JavaScript API.

**Important distinction:** AST parsing improves structural accuracy, but it does not automatically establish data flow, resolve every identifier, or prove exploitability. Advanced taint analysis and interprocedural reasoning require additional analysis capabilities.

## Architecture & Event Flow

CodeGuardians follows an event-driven integration model. GitHub initiates the scan through webhooks, the serverless backend coordinates analysis, and the dashboard exposes persisted scan telemetry.

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer
    participant GH as GitHub
    participant API as Next.js Webhook Route
    participant Octo as Octokit / GitHub API
    participant Babel as Babel Analysis Engine
    participant DB as Neon PostgreSQL
    participant UI as CodeGuardians Dashboard

    Dev->>GH: Open or update pull request
    GH->>API: Send webhook with HMAC SHA-256 signature
    API->>API: Verify signature and event authenticity
    API->>Octo: Request PR metadata and changed-file diffs
    Octo-->>API: Return authorized PR data
    API->>Babel: Submit eligible source changes
    Babel->>Babel: Parse source and traverse AST
    Babel-->>API: Return structured security findings
    API->>Octo: Publish Markdown diagnostics comment
    Octo-->>GH: Comment appears on pull request
    API->>DB: Persist scan and audit telemetry
    DB-->>UI: Serve persisted scan metrics
    UI-->>Dev: Display metrics and navigable PR links
```

### Component responsibilities

| Component | Responsibility |
|---|---|
| GitHub App | Supplies repository-level integration and scoped API access |
| Webhook endpoint | Authenticates incoming events and dispatches eligible scans |
| Octokit | Retrieves pull request metadata, changed files, and posts diagnostics |
| Babel engine | Parses supported JavaScript/TypeScript syntax and evaluates security rules |
| Neon PostgreSQL | Stores scan records, findings, and audit telemetry |
| Next.js dashboard | Presents scan history, metrics, statuses, and navigation links |
| Vercel | Hosts the web application and serverless execution environment |

### Webhook security

GitHub webhook authenticity must be verified using the `X-Hub-Signature-256` header and the configured webhook secret.

The verification process should:

1. Read the original request body without modifying or reserializing it.
2. Compute the expected HMAC-SHA256 digest using the webhook secret.
3. Compare the expected and received signatures using a timing-safe comparison.
4. Reject invalid signatures before processing the event.
5. Validate the event type and action before initiating a scan.

GitHub App authentication and webhook signature verification serve different purposes: the webhook signature authenticates the incoming event, while the GitHub App's credentials authorize API operations.

Production deployments should also account for webhook redelivery, duplicate events, request timeouts, API rate limits, and idempotent scan processing.

## Security Engine & Rules

The security engine currently focuses on three categories of potentially dangerous code patterns.

| Rule ID | Severity | AST node targeted | Risk description |
|---|---|---|---|
| `hardcoded-secret` | High | `VariableDeclarator`, `AssignmentExpression` | Flags credential-like values assigned directly to variables or properties, including API keys, AWS keys, passwords, and tokens. |
| `unsafe-eval` | High | `CallExpression`, `NewExpression` | Detects direct calls to `eval()` and dynamic `Function` constructor usage, which can execute dynamically supplied JavaScript. |
| `env-leak` | High | `MemberExpression`, `CallExpression` | Detects sensitive environment-variable access and patterns that pass raw `process.env` values directly to `console.log` or stdout. |

*Severity labels represent the intended rule policy; findings require contextual review and are not automatically proof of an exploitable vulnerability.*

### 1. `hardcoded-secret`

Detects suspicious assignments where sensitive values are embedded directly in source code.

```ts
const apiKey = "sk_example_sensitive_value";
const password = "replace-me";
```

**Detection approach:** Inspect variable declarations and assignments, evaluate relevant identifier names and literal values, and apply credential-oriented matching rules.

**Engineering consideration:** Avoid persisting or publishing the complete matched secret. Diagnostics should redact sensitive values and identify the affected location instead.

### 2. `unsafe-eval`

Detects direct dynamic-code execution patterns.

```ts
eval(userSuppliedExpression);

const handler = new Function("input", "return input");
```

**Detection approach:** Inspect `CallExpression` and `NewExpression` nodes and evaluate their callee structure.

**Engineering consideration:** Distinguish direct global calls from shadowed identifiers and unrelated property calls wherever the implementation supports that context.

### 3. `env-leak`

Detects patterns that expose environment configuration through logging.

```ts
console.log(process.env.API_KEY);
console.log(process.env);
```

**Detection approach:** Inspect environment-variable member access and its relationship to logging calls or stdout-writing operations.

**Engineering consideration:** Sensitive-variable identification and output-flow analysis are distinct concerns. A robust implementation should document the exact supported patterns and avoid implying that every possible indirect leak is detected.

### Diagnostics format

Findings should provide enough information for a developer to reproduce and resolve the issue without disclosing the sensitive value.

| Field | Purpose |
|---|---|
| Rule ID | Stable identifier for the violated rule |
| Severity | Relative risk classification |
| File | Changed source file containing the finding |
| Line / column | Source location for review |
| Description | Concise explanation of the risk |
| Remediation | Recommended corrective action |

An example pull request report:

```markdown
## CodeGuardians Security Report

| Severity | Rule | Location | Finding |
|---|---|---|---|
| High | unsafe-eval | src/handler.ts:18 | Dynamic evaluation detected |
| High | hardcoded-secret | src/config.ts:7 | Potential hardcoded credential |
| High | env-leak | src/debug.ts:12 | Environment data may reach logs |

Review the flagged code before merging.
```

The example illustrates the intended report format; it is not a claim that a particular repository has already produced these findings.

## Dashboard & Telemetry

The CodeGuardians dashboard provides an operational view of repository security activity, connecting scan outcomes to the pull requests where developers can take action.

### Monitoring capabilities

- **Real-time-oriented metrics:** Scan counts, findings, and recent activity derived from persisted telemetry, subject to the dashboard's refresh strategy.
- **Security status badges:** At-a-glance indicators for scan outcomes and finding severity.
- **Interactive deep-links:** Navigate directly to the relevant pull request, commit, repository, or finding location when the required identifiers are available.
- **Scan history:** Review previous analysis runs and their reported outcomes.
- **Dark-mode interface:** A monitoring-oriented interface built with Next.js and Tailwind CSS.
- **Centralized audit records:** Preserve scan metadata and rule findings for operational review.

### Example dashboard metrics

| Metric | Description |
|---|---|
| Total scans | Number of recorded scan executions |
| Findings detected | Number of security findings reported |
| High-severity findings | Findings classified as high severity |
| Clean scans | Scans that completed without reported findings |
| Recent activity | Latest recorded repository scan events |

Metrics should distinguish successful clean scans from failed or incomplete scans. A failed scan must not be presented as a clean result.

*Dashboard screenshot: [Add a screenshot of the deployed CodeGuardians dashboard here.]*

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Language | TypeScript, strict mode | Type-safe application and rule-engine implementation |
| Runtime | Node.js | Server-side execution |
| Web application | Next.js App Router | Dashboard and webhook routes |
| Styling | Tailwind CSS | Responsive dark-mode interface |
| Parser | `@babel/parser` | Parse supported JavaScript and TypeScript syntax |
| Traversal | `@babel/traverse` | Walk AST nodes and evaluate rules |
| AST types | `@babel/types` | Inspect and classify syntax nodes |
| GitHub integration | GitHub Apps API | Repository access and pull request automation |
| Authentication | `@octokit/auth-app` | GitHub App authentication |
| Webhooks | `@octokit/webhooks` | Webhook event types and integration utilities |
| Persistence | Neon Serverless PostgreSQL | Scan records and audit telemetry |
| Deployment | Vercel | Serverless application hosting |

## Local Development & Self-Hosting

### Prerequisites

Install the following before starting:

- Node.js LTS compatible with the project's dependencies.
- npm.
- Git.
- A GitHub account with permission to install a GitHub App.
- A Neon PostgreSQL database.
- A Vercel account if you intend to deploy the application.

### 1. Clone the repository

Replace the repository URL with the actual CodeGuardians repository URL.

```bash
git clone https://github.com/<your-username>/CodeGuardians.git
cd CodeGuardians
npm install
```

### 2. Configure environment variables

Create a `.env.local` file in the project root:

```dotenv
# Application
NODE_ENV=development
APP_URL=http://localhost:3000

# Neon PostgreSQL
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"

# GitHub App
GITHUB_APP_ID=your_github_app_id
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nYOUR_PRIVATE_KEY_CONTENT\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=your_webhook_secret
```

Use the exact variable names expected by the implementation. If the application uses different names or an ORM-specific connection configuration, update this template accordingly.

**Security requirements:**

- Never commit `.env.local` or any private key to Git.
- Keep the GitHub App private key and webhook secret server-side.
- Do not expose server credentials through `NEXT_PUBLIC_*` environment variables.
- Use separate credentials for development and production.
- Rotate any credential that has been exposed.

### 3. Create and configure the GitHub App

In GitHub, navigate to **Settings → Developer settings → GitHub Apps** and create an app for CodeGuardians.

Configure the following:

- **Webhook URL:** Your publicly reachable webhook endpoint.
- **Webhook secret:** A securely generated secret matching `GITHUB_WEBHOOK_SECRET`.
- **Permissions:** Grant only the repository and pull request permissions required by the implemented workflow, including permission to read pull request changes and write pull request comments.
- **Events:** Subscribe to pull request events required by the scanner, such as opened, reopened, and synchronized.

Generate and download the GitHub App private key, then configure the corresponding environment variable.

For local webhook testing, expose your local server through a secure development tunnel and use the resulting HTTPS URL in your GitHub App configuration. Do not expose the development server or its credentials unnecessarily.

### 4. Initialize the database

Create a Neon PostgreSQL project and configure `DATABASE_URL` with its connection string.

Apply the repository's actual database schema and migrations before starting the application.

For example, if the project uses Prisma:

```bash
npx prisma migrate deploy
npx prisma generate
```

For a new local development database, use the project's documented development migration workflow instead of assuming that production migrations exist.

If the implementation uses SQL migration files or another database migration tool, run the corresponding commands from the repository.

### 5. Start the development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

The application should now be available for local dashboard development. Webhook-driven scanning additionally requires a reachable webhook URL, valid GitHub App credentials, configured event subscriptions, and the required database schema.

### 6. Verify the integration

Before treating the deployment as operational, verify each layer independently:

1. Open or update a test pull request in an installed repository.
2. Confirm GitHub delivers the expected webhook event.
3. Verify that invalid webhook signatures are rejected.
4. Confirm the server retrieves only authorized pull request data.
5. Run a test file containing a known unsafe-evaluation pattern.
6. Verify the parser reports the expected finding and source location.
7. Confirm the GitHub comment is created successfully.
8. Verify that scan telemetry is persisted and rendered in the dashboard.

### 7. Deploy to Vercel

Connect the repository to Vercel and configure the production environment variables in the project settings.

Deploy the application, then:

1. Set `APP_URL` to the production application URL.
2. Update the GitHub App webhook URL to the production endpoint.
3. Configure the production database connection.
4. Apply the required migrations.
5. Verify GitHub App permissions and webhook subscriptions.
6. Test the complete pull request lifecycle against a dedicated test repository.

**Deployment note:** A serverless environment is not a persistent worker. Keep webhook processing within platform execution limits, make scan operations idempotent, and introduce a durable queue or background-processing service if larger diffs or execution times exceed those limits.

## Operational & Security Considerations

CodeGuardians is intended to improve developer feedback loops, but the reliability of its security reports depends on how the scanner is implemented and operated.

- **Webhook authenticity:** Validate HMAC signatures against the original request body.
- **Least privilege:** Restrict GitHub App permissions to the resources required by the application.
- **Input limits:** Enforce file-size, diff-size, and supported-language limits before parsing.
- **Failure isolation:** Record parser errors and unsupported syntax as scan failures or partial results rather than clean scans.
- **Secret redaction:** Never publish raw credential values in pull request comments or application logs.
- **Idempotency:** Prevent duplicate webhook deliveries from producing duplicate scans or comments.
- **API resilience:** Handle GitHub rate limits, transient errors, and permission failures.
- **Data minimization:** Persist only the source excerpts and metadata necessary for diagnostics and auditing.
- **Free-tier constraints:** Monitor serverless execution, database usage, and provider quotas. Free-tier availability and limits may change.

### Current scope

The initial rule set targets selected JavaScript and TypeScript security patterns. AST-based detection reduces certain classes of text-matching false positives, but it does not guarantee complete vulnerability detection.

Detection coverage depends on the implemented rules, supported syntax, source preprocessing, and context analysis. Findings should be reviewed before being treated as confirmed vulnerabilities.

## Roadmap

Potential extensions for future releases include:

- [ ] Additional security rules for command injection, unsafe deserialization, and other dangerous APIs.
- [ ] Scope-aware identifier resolution and stronger false-positive reduction.
- [ ] Source-to-sink data-flow and taint analysis.
- [ ] Inline review annotations and richer pull request diagnostics.
- [ ] Configurable severity thresholds and repository-specific rule policies.
- [ ] Baseline comparisons to identify newly introduced findings.
- [ ] SARIF export for integration with compatible code-scanning platforms.
- [ ] Test coverage, rule fixtures, and regression benchmarks.
- [ ] Durable background processing for larger repositories.
- [ ] Documented API limits, retention policies, and operational health metrics.

## Links & Live Demo

| Resource | Link |
|---|---|
| Live dashboard | [Coming soon — add deployment URL](https://example.com) |
| GitHub App installation | [Coming soon — add public installation URL](https://github.com/apps) |
| Source repository | [Add public repository URL](https://github.com) |
| Demo pull request comment | Add a screenshot of a real, redacted CodeGuardians diagnostic report |


## License

CodeGuardians is distributed under the MIT License. See [`LICENSE`](LICENSE) for the full license text.

---

**CodeGuardians — Security feedback where code review happens.**
