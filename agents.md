# Using multi-agents in Cursor

This document summarizes how Cursor runs **multiple agents** in practice. Cursor combines three related ideas: **parallel agents in Git worktrees**, **subagents** (delegation with isolated context), and **cloud agents** (remote VMs). Official references are linked at the end.

---

## 1. Parallel agents (Git worktrees)

**What it is:** You run one or more agents **locally**, each in its **own Git worktree**—a separate checkout of the same repo so agents do not overwrite each other’s files while they work.

**Typical flow:**

1. Open the agent UI in Cursor and start a run that uses worktrees (see Cursor’s **Parallel agents** / worktree documentation in settings or docs).
2. Each parallel agent works in isolation; when a run finishes, use **Apply** to merge that agent’s changes into your **current branch** in the main working tree. (This differs from the **Keep** behavior used for some local agent flows—follow the in-app labels.)

**Best-of-N (same prompt, multiple models):** You can run **one prompt** across **several models** at once. Cursor shows a card per model; compare diffs, then **Apply** the result you want onto your checked-out branch.

**When it helps:**

- Parallelizing unrelated edits (fewer file conflicts).
- Hard problems where different models take different approaches.
- Comparing quality or catching edge cases across models.

**Worktree setup (optional):** Add `.cursor/worktrees.json` to run commands when a worktree is created (for example `npm ci`, copy `.env`, migrations). Use **`$ROOT_WORKTREE_PATH`** to copy secrets or config from your main tree—do not symlink `node_modules` into worktrees; prefer fast installs (`pnpm`, `bun`, `uv`, etc.).

**Limits and caveats (from docs):** Cursor manages cleanup (e.g. per-workspace worktree caps). **LSP is not supported in worktrees** today, so agents there may not get the same IDE lint integration as your main tree.

**Inspect worktrees:** `git worktree list`

---

## 2. Subagents

**What it is:** The main **Agent** can **delegate** work to **subagents**. Each subagent has its **own context window**, can run **in parallel**, and returns a summary to the parent—so long research, bash output, or browser noise does not bloat the main chat.

**Modes:**

| Mode        | Behavior                         | Good for                          |
|------------|-----------------------------------|-----------------------------------|
| Foreground | Blocks until the subagent finishes | You need the result immediately   |
| Background | Returns immediately; work continues | Long jobs or parallel workstreams |

Set `is_background: true` in custom subagent frontmatter for background mode.

**Built-in subagents (no setup):**

| Subagent | Role |
|----------|------|
| **Explore** | Search and analyze the codebase (often a faster model, parallel searches). |
| **Bash**    | Run shell commands; verbose output stays out of the parent context. |
| **Browser** | Drive the browser via MCP; filters noisy DOM/screenshots to useful summaries. |

**Custom subagents:** Markdown files with YAML frontmatter.

- **Project:** `.cursor/agents/` (also `.claude/agents/` or `.codex/agents/` for compatibility; `.cursor/` wins on name conflicts).
- **User (all projects):** `~/.cursor/agents/`

**Frontmatter fields (common):**

- `name`, `description` — `description` strongly influences when Agent delegates; write it like tool routing hints (“Use when …”).
- `model`: `inherit`, `fast`, or a specific model id.
- `readonly: true` — read-only / non-destructive runs.
- `is_background: true` — non-blocking subagent.

**How to invoke:**

- Agent may delegate **automatically** based on task and descriptions (phrases like “use proactively” in `description` nudge delegation).
- **Explicit:** `/your-subagent-name` in the prompt, or natural language (“use the verifier subagent to …”).
- **Parallel:** Ask for two things in parallel in one message; Agent can issue multiple subagent tasks at once.
- **Resume:** Subagents return an id; you can **resume** with that id to continue with preserved context (useful for long runs).

**Subagents vs skills:** Use **subagents** for isolated context, parallel streams, or multi-step specialization. Use **[skills](https://cursor.com/docs/skills.md)** for short, repeatable, single-purpose actions (changelog, format imports) that do not need a separate context window.

**Cost note:** Parallel subagents each consume tokens in their own context—parallelism increases throughput but also usage.

---

## 3. Cloud agents

**What it is:** Agents run in **isolated cloud environments** (VMs), not on your laptop. Same agent ideas as locally, but suitable when you want **many parallel agents** or runs that **do not require your machine to stay online**.

**How to start (high level):**

- **Cursor Web:** [cursor.com/agents](https://cursor.com/agents)
- **Desktop:** choose **Cloud** in the agent target dropdown.
- **Integrations:** Slack, GitHub/GitLab (`@cursor` on issues/PRs), Linear, API—see cloud agent docs.

**How it works with Git:** The service clones your repo, works on a **branch**, and **pushes** for you to review and merge.

**Extras:** Cloud agents can use **[MCP](https://cursor.com/docs/mcp.md)** (team-configured), build/test in the VM, and use computer/browser automation where supported. Configure **secrets** in the dashboard (not only local `.env` files).

**Note:** Cloud Agents were previously called **Background Agents**; some UI or articles may still use the old name.

---

## Quick choice guide

| Goal | Prefer |
|------|--------|
| Same task, compare models or parallel local edits without conflicts | **Parallel agents / worktrees** + **Apply** |
| Heavy exploration, shell, or browser without filling main chat | **Built-in subagents** (automatic) |
| Team specialists, verifiers, custom workflows with clean context | **Custom subagents** in `.cursor/agents/` |
| Many agents, off-machine runs, PR/issue triggers | **Cloud agents** |

---

## Official documentation

- [Parallel agents / worktrees](https://cursor.com/docs/configuration/worktrees)
- [Subagents](https://cursor.com/docs/subagents)
- [Cloud agents](https://cursor.com/docs/cloud-agent)
- [Cloud agent capabilities](https://cursor.com/docs/cloud-agent/capabilities)
- [Agent overview](https://cursor.com/docs/agent/overview)
- [Skills](https://cursor.com/docs/skills.md) (complement to subagents)

Cursor’s doc index: [cursor.com/llms.txt](https://cursor.com/llms.txt)
