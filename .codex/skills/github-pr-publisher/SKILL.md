---
name: github-pr-publisher
description: Commit local repository changes, create or use an appropriate git branch, push it to GitHub, open a pull request, and report the PR link to the user. Use when the user asks Codex to publish current work, commit changes, push a branch, create a GitHub PR, open a pull request, or send a PR link.
---

# GitHub PR Publisher

## Overview

Publish repository changes to GitHub with a disciplined git workflow. Preserve unrelated user work, verify the change before publishing when practical, and finish with the pull request URL.

## Workflow

### 1. Inspect State

Run:

```bash
git status --short --branch
git remote -v
git branch --show-current
```

Identify exactly which files belong to the user's requested change. Do not stage, revert, reformat, or otherwise modify unrelated work. If unrelated changes are mixed into a file that must be committed, inspect the diff carefully and stage only the intended hunks.

### 2. Choose Branch

Use the current branch if it is already a suitable feature branch. If the current branch is protected or shared, such as `main`, `master`, `develop`, or `release/*`, create a new branch.

Prefer the repository's branch naming convention. If none is obvious, use:

```bash
git switch -c codex/<short-task-slug>
```

Keep the slug lowercase, short, and descriptive.

### 3. Verify Before Commit

Run the narrowest meaningful checks for the change. For this repository, prefer:

```bash
npm test
npm run lint
npm run build
```

If a check is too expensive or blocked by the environment, state that in the final response. Do not claim verification that did not run.

### 4. Stage and Commit

Review the final diff:

```bash
git diff
git status --short
```

Stage only the intended files or hunks:

```bash
git add <paths>
git diff --cached
```

Write a brief imperative commit subject. Use the user's requested message if provided.

```bash
git commit -m "<imperative subject>"
```

### 5. Push and Create PR

Push the branch:

```bash
git push -u origin <branch>
```

Create the pull request with the GitHub MCP tools when available. Otherwise use the GitHub CLI:

```bash
gh pr create --fill
```

If `--fill` produces a weak description, create the PR with an explicit title and body:

```bash
gh pr create --title "<title>" --body "<summary and verification>"
```

If GitHub authentication is missing or the remote is not a GitHub repository, stop and report the blocker with the exact next action needed from the user.

### 6. Final Response

Report:

- PR link
- Branch name
- Commit hash or commit subject
- Verification commands and results
- Any skipped checks or known blockers

Keep the response concise. The PR URL must be easy to copy and must be included even if additional GitHub UI metadata is available.
