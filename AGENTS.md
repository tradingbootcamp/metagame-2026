<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Worktrees

Always work in a worktree, never in this checkout directly, even for a one-line fix.
Use Claude Code's built-in worktree flow.

## Code comments

Minimal. A short note for a non-obvious _why_ is fine; don't narrate the change
itself or let a comment grow into a PR report.
