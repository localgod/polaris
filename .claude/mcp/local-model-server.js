#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { spawn } from "child_process";
import { readFile } from "fs/promises";

const MODEL_URL = "http://host.docker.internal:12434/engines/v1/chat/completions";
const DEFAULT_MODEL = "docker.io/ai/qwen2.5:7B-Q4_K_M";
const PROJECT_ROOT = "/workspaces/polaris";
const PR_TEMPLATE_PATH = `${PROJECT_ROOT}/.github/PULL_REQUEST_TEMPLATE.md`;
const GRAPH_SCHEMA_PATH = `${PROJECT_ROOT}/.claude/mcp/graph-schema.md`;

const graphSchema = await readFile(GRAPH_SCHEMA_PATH, "utf-8").catch(() => "");

const POLARIS_CONTEXT = `You are a coding assistant supporting development of "Polaris", an enterprise technology catalog and SBOM tracking application.

Tech stack: Nuxt 4, Vue 3, TypeScript, Neo4j graph database, @nuxt/ui, Vitest, Zod.
Architecture: 3-layer API (endpoints → services → repositories), Cypher queries in .cypher files.
Graph model: Technology, System, Team, Component, Policy nodes; OWNS, APPROVES, USES, DEPENDS_ON relationships.`;

async function callModel(system, prompt) {
  const res = await fetch(MODEL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Model request failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "(no response)";
}

function runCommand(command, args, cwd = PROJECT_ROOT, timeoutMs = 120000) {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { cwd, shell: false });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    const timer = setTimeout(() => {
      proc.kill();
      resolve({ stdout, stderr: stderr + "\n[TIMEOUT]", exitCode: -1 });
    }, timeoutMs);
    proc.on("close", (exitCode) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode });
    });
  });
}

function text(content) {
  return { content: [{ type: "text", text: content }] };
}

// ─── Server ──────────────────────────────────────────────────────────────────

const server = new McpServer({ name: "local-model", version: "2.0.0" });

// 1. Generic fallback
server.tool(
  "ask_local_model",
  "General-purpose fallback. Use for quick lookups or tasks that don't fit a specialized tool.",
  { prompt: z.string(), system: z.string().optional() },
  async ({ prompt, system }) => text(await callModel(system ?? POLARIS_CONTEXT, prompt))
);

// 2. Summarize code
server.tool(
  "summarize_code",
  "Summarize what a file or code snippet does. Use when exploring unfamiliar code to get a quick overview without reading every line.",
  {
    code: z.string().describe("File content or code snippet to summarize"),
    context: z.string().optional().describe("Optional hint about what you're looking for"),
  },
  async ({ code, context }) => {
    const system = `${POLARIS_CONTEXT}

Summarize code concisely:
- What it does (1-2 sentences)
- Key exports / public API
- Important side effects or dependencies
- Anything surprising or worth flagging
No preamble. Bullet points preferred.`;
    return text(await callModel(system, context ? `Context: ${context}\n\n${code}` : code));
  }
);

// 3. Review snippet
server.tool(
  "review_snippet",
  "First-pass code review against Polaris conventions. Flags bugs, missing patterns, auth omissions. Use before deep-diving into a complex change.",
  {
    code: z.string().describe("Code to review"),
    focus: z.string().optional().describe("Optional: specific concern (e.g. 'Neo4j query correctness', 'error handling')"),
  },
  async ({ code, focus }) => {
    const system = `${POLARIS_CONTEXT}

Review code for the Polaris project. Flag:
- Bugs or logic errors
- Missing error handling (use sendBadRequest/sendNotFound/sendConflict helpers, not raw throw)
- Response shape violations (must use sendSuccess/sendCreated/sendNoContentResponse)
- Auth guard omissions (requireAuth/requireSuperuser must be called at the top of handlers)
- Cypher query issues (missing parameterization, missing DETACH DELETE, unindexed lookups)
- TypeScript issues (implicit any, missing return types on exported functions)
- 3-layer violations (e.g. business logic in an endpoint, DB queries in a service)

Be direct. List issues only — no praise, no preamble. If no issues, say "LGTM".`;
    return text(await callModel(system, focus ? `Focus on: ${focus}\n\n${code}` : code));
  }
);

// 4. Draft Cypher query
server.tool(
  "draft_cypher",
  "Draft a Neo4j Cypher query for the Polaris graph schema from a plain English description.",
  {
    description: z.string().describe("What data you need (e.g. 'find all technologies owned by a team with their approval status')"),
    queryType: z.enum(["read", "write", "migration"]).optional().describe("Type of query (default: read)"),
  },
  async ({ description, queryType = "read" }) => {
    const system = `${POLARIS_CONTEXT}

Write Cypher queries using the exact schema below.

${graphSchema}

Conventions:
- Always use parameters ($param) — never string interpolation
- Use OPTIONAL MATCH for nullable relationships
- Prefer named RETURN columns over full nodes
- Pagination: SKIP toInteger($offset) LIMIT toInteger($limit)
- Dynamic ORDER BY: use {{ORDER_BY}} placeholder (replaced at runtime by injectOrderBy())
- Migration queries: use CALL {} blocks for batching large updates

Output only the Cypher query. No explanation unless asked.`;
    return text(await callModel(system, `Query type: ${queryType}\n\n${description}`));
  }
);

// 5. Draft commit message
server.tool(
  "draft_commit_message",
  "Draft a conventional commit message from a git diff. Infers type and scope, writes subject + optional body. Aligned with the project PR template change types.",
  {
    diff: z.string().describe("Output of git diff or git diff HEAD"),
    context: z.string().optional().describe("Optional: extra context about the intent of the change"),
  },
  async ({ diff, context }) => {
    const system = `${POLARIS_CONTEXT}

Write a git commit message following Conventional Commits.

Types (aligned with the project PR template):
- fix:      bug fix (non-breaking)
- feat:     new feature (non-breaking)
- schema:   Neo4j migration or schema change
- refactor: restructure with no behaviour change
- test:     adding or fixing tests
- docs:     documentation only
- chore:    build, config, tooling, CI

Format:
<type>(<optional scope>): <subject in imperative mood, max 72 chars>

<optional body: WHY, not WHAT. Bullet points. Only include if the change is non-obvious.>

Scope examples: technology, sbom, auth, neo4j, ci, components, api
Subject: imperative mood ("add" not "added"), no period at end.
Output the commit message only — no preamble.`;

    return text(await callModel(system, context ? `Intent: ${context}\n\nDiff:\n${diff}` : `Diff:\n${diff}`));
  }
);

// 6. Draft PR body + title
server.tool(
  "create_pr_body",
  "Fill in the Polaris PR template from a git diff. Returns a suggested title and completed PR body ready for `gh pr create --title ... --body ...`.",
  {
    diff: z.string().describe("Output of git diff main...HEAD"),
    context: z.string().optional().describe("Optional: intent or issue number to reference (e.g. 'fixes #42')"),
  },
  async ({ diff, context }) => {
    let template;
    try {
      template = await readFile(PR_TEMPLATE_PATH, "utf-8");
    } catch {
      template = "## Description\n\n## Changes Made\n\n- \n";
    }

    const system = `${POLARIS_CONTEXT}

Fill in a GitHub pull request body using the provided template. Replace placeholder HTML comments with real content based on the diff.

Rules:
- Description: 1-3 sentences focused on WHY, not WHAT
- Type of Change: mark exactly one checkbox with [x]
- Changes Made: 3-6 specific, concrete bullet points
- Related Issues: include if an issue number is provided; otherwise omit the section entirely
- Screenshots: omit this section entirely
- Checklist: leave all items unchecked ([ ]) — the developer fills these in
- Additional Notes: only include if something genuinely needs flagging for reviewers; otherwise omit

First line of output must be:
TITLE: <suggested PR title, max 70 chars, imperative mood, no period>

Then a blank line, then the filled PR body.`;

    const prompt = `${context ? `Context: ${context}\n\n` : ""}PR Template:\n${template}\n\nDiff:\n${diff.slice(0, 12000)}`;
    return text(await callModel(system, prompt));
  }
);

// 7. Run tests and diagnose
server.tool(
  "run_tests",
  "Run the test suite (or a specific file/layer) and return a diagnosis of any failures. Prefer this over running npm test manually.",
  {
    path: z.string().optional().describe("Specific test file or directory (e.g. 'test/server/api/components.spec.ts')"),
    layer: z.enum(["api", "services", "repositories", "utils", "app", "all"]).optional().describe("Shorthand to run a specific layer (ignored if path is provided)"),
  },
  async ({ path, layer }) => {
    const layerCommands = {
      api: ["test:server:api"],
      services: ["test:server:services"],
      repositories: ["test:server:repositories"],
      utils: ["test:server:utils"],
      app: ["test:app"],
    };

    const [command, args] = path
      ? ["npx", ["vitest", "run", path]]
      : ["npm", ["run", layer && layer !== "all" ? layerCommands[layer][0] : "test"]];

    const { stdout, stderr, exitCode } = await runCommand(command, args);
    const raw = (stdout + "\n" + stderr).trim();

    if (exitCode === 0) {
      const summary = raw.match(/Tests\s+[^\n]+/)?.[0] ?? "All tests passed.";
      return text(summary);
    }

    const system = `${POLARIS_CONTEXT}

Analyze Vitest test output and summarize failures:
- List each failing test: filename + test name + root cause in one sentence
- Group tests that fail for the same reason
- For each failure, suggest the most likely fix (wrong mock return shape, missing stub, assertion mismatch, etc.)
- Note if a failure is in beforeAll/beforeEach setup vs the test itself

Be specific — include actual vs expected values where visible. No preamble. Bullet list.`;

    return text(await callModel(system, `Test output:\n${raw.slice(-8000)}`));
  }
);

// 8. Run lint and summarize
server.tool(
  "run_lint",
  "Run ESLint and return a grouped summary of issues. More actionable than reading raw ESLint output.",
  {
    fix: z.boolean().optional().describe("Auto-fix fixable issues before summarizing (default: false)"),
    path: z.string().optional().describe("Limit lint to a specific file or directory"),
  },
  async ({ fix = false, path }) => {
    const script = fix ? "lint:fix" : "lint";
    const args = path ? ["run", script, "--", path] : ["run", script];
    const { stdout, stderr, exitCode } = await runCommand("npm", args);
    const raw = (stdout + "\n" + stderr).trim();

    if (exitCode === 0) return text("No lint errors.");

    const system = `${POLARIS_CONTEXT}

Analyze ESLint output and produce a grouped, actionable summary:
- Group errors by rule/type with counts (e.g. "no-unused-vars × 5 in server/api/")
- For each group, list affected files
- Note which groups are auto-fixable with --fix
- End with the fastest resolution path (e.g. "run lint:fix to clear N warnings, then manually fix M type errors")

No preamble. Bullet list.`;

    return text(await callModel(system, `ESLint output:\n${raw.slice(-6000)}`));
  }
);

// 9. Run markdown lint and summarize
server.tool(
  "run_mdlint",
  "Run markdownlint and return a grouped summary of issues. Prefer this over running npm run mdlint manually.",
  {
    fix: z.boolean().optional().describe("Auto-fix fixable issues before summarizing (default: false)"),
    path: z.string().optional().describe("Limit lint to a specific file or directory (default: **/*.md)"),
  },
  async ({ fix = false, path }) => {
    const args = [path ?? "**/*.md", "--ignore", "node_modules"];
    if (fix) args.push("--fix");
    const { stdout, stderr, exitCode } = await runCommand("npx", ["markdownlint", ...args]);
    const raw = (stdout + "\n" + stderr).trim();

    if (exitCode === 0) return text("No markdown lint errors.");

    const system = `${POLARIS_CONTEXT}

Analyze markdownlint output and produce a grouped, actionable summary:
- Group violations by rule (e.g. "MD012 × 3 in docs/") with counts
- For each group, list affected files and line numbers
- Note which groups are auto-fixable with --fix
- End with the fastest resolution path

No preamble. Bullet list.`;

    return text(await callModel(system, `markdownlint output:\n${raw.slice(-6000)}`));
  }
);

// 10. Generate OpenAPI docs
server.tool(
  "generate_docs",
  "Generate the OpenAPI docs (public/openapi.json) and report whether anything changed, or diagnose the failure. Prefer this over running npm run docs:api manually.",
  {},
  async () => {
    const { stdout, stderr, exitCode } = await runCommand("npm", ["run", "docs:api"]);
    const raw = (stdout + "\n" + stderr).trim();

    if (exitCode === 0) {
      const diff = await runCommand("git", ["diff", "--stat", "--", "public/openapi.json"]);
      const changed = diff.stdout.trim();
      return text(changed ? `OpenAPI docs generated — changed:\n${changed}` : "OpenAPI docs generated — no changes.");
    }

    const system = `${POLARIS_CONTEXT}

Analyze the error output from generating OpenAPI docs (server/scripts/generate-openapi.ts) and:
- State the root cause in one sentence (e.g. bad route/schema definition, missing import, type error)
- Point to the specific file/line if visible in the output
- Suggest the fix

No preamble. Bullet list.`;

    return text(await callModel(system, `Output:\n${raw.slice(-8000)}`));
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
