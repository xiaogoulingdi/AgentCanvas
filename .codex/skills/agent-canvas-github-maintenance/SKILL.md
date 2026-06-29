---
name: agent-canvas-github-maintenance
description: GitHub maintenance workflow for the Agent Canvas repository. Use when working in this project and the task involves Git, GitHub, commits, branches, pull requests, repository hygiene, .gitignore, dependency tracking, release flow, or documentation/process norms.
---

# Agent Canvas GitHub Maintenance

Use this skill when maintaining the Agent Canvas repository.

## Repository Rules

- Keep `main` stable and deployable.
- Use short-lived branches for non-trivial work.
- Do not commit generated dependency folders such as `node_modules/`.
- Do not commit API keys, `.env`, local logs, generated traces, or temporary files.
- Prefer small, reviewable commits grouped by intent.
- Run verification before committing code changes.

## Branch Strategy

Use lightweight GitHub Flow:

```text
main
  -> docs/*
  -> feat/*
  -> fix/*
  -> chore/*
```

Branch examples:

- `docs/github-maintenance-skill`
- `feat/workflow-compiler`
- `fix/event-projection`
- `chore/gitignore`

Avoid vague names:

- `update`
- `test`
- `new`
- `my-branch`

## Commit Messages

Use Conventional Commits:

```text
docs: add GitHub maintenance skill
feat: add workflow compiler
fix: reject unbounded discussion rounds
test: cover fake backend artifact events
chore: ignore generated dependency files
```

Commit types:

- `feat`: product or code capability
- `fix`: bug fix
- `docs`: documentation only
- `test`: tests only
- `chore`: maintenance, dependencies, repo hygiene
- `refactor`: internal change without behavior change

## Pre-Commit Checks

Before committing code changes, run:

```powershell
npm.cmd run check
npm.cmd test
```

For fake runtime verification, run:

```powershell
npm.cmd run run:fake
```

Use `npm.cmd` on Windows PowerShell because script execution policy may block `npm.ps1`.

## Pull Request Checklist

Each PR should explain:

- What changed.
- Why it changed.
- How it was verified.
- Any follow-up risks or known gaps.

Suggested PR body:

```markdown
## Summary

## Verification

- [ ] npm.cmd run check
- [ ] npm.cmd test
- [ ] npm.cmd run run:fake

## Notes
```

## Repository Hygiene

`.gitignore` must include:

```text
node_modules/
dist/
build/
coverage/
.env
.env.*
*.log
.agent-canvas/
tmp/
temp/
```

If `node_modules` was accidentally committed, remove it from Git tracking but keep local files:

```powershell
git rm -r --cached node_modules
git add .gitignore
git add -u node_modules
git commit -m "chore: ignore generated dependency files"
```

## Relationship To Project Docs

- Use `docs/PROJECT_STRUCTURE.md` for directory rules.
- Use `docs/DECISIONS.md` for architecture decisions.
- Use `docs/SPIKE_PLAN.md` for current implementation sequence.
- Use `docs/MODEL_API_INTEGRATION.md` for API key and model integration rules.

