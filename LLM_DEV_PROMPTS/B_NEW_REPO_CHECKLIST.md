---
title: New Repo Checklist
last_modified: 2026-02-22
---

Use this checklist when creating a new repository from scratch. Follow the steps
in order. Full policies are at
`https://github.com/kjannette/LLM_DEV_PROMPTS/raw/branch/main/prompts/REPO_POLICIES.md`.

Template files can be fetched from:
`https://github.com/kjannette/LLM_DEV_PROMPTS/raw/branch/main/<path>`

# 1. Initialize

- [ ] `git init`
- [ ] Ask the user for the license (MIT, GPL, or WTFPL)

# 2. First Commit (README only)

- [ ] Create `README.md` with all required sections:
    - [ ] **Description**: name, purpose, category, license, author
    - [ ] **Getting Started**: copy-pasteable code block
    - [ ] **Rationale**: why does this exist?
    - [ ] **Design**: how is it structured?
    - [ ] **TODO**: initial task list
    - [ ] **License**: matches chosen license
    - [ ] **Author**: [@sjdev](https://sjdev.co)
- [ ] `git add README.md && git commit`

# 3. Scaffolding (feature branch)

- [ ] `git checkout -b initial-scaffolding`

## Fetch Template Files

- [ ] `.gitignore` — fetch from
      `https://github.com/kjannette/LLM_DEV_PROMPTS/raw/branch/main/.gitignore`, extend for
      language-specific artifacts
- [ ] `.editorconfig` — fetch from
      `https://github.com/kjannette/LLM_DEV_PROMPTS/raw/branch/main/.editorconfig`
- [ ] `Makefile` — fetch from
      `https://github.com/kjannette/LLM_DEV_PROMPTS/raw/branch/main/Makefile`, adapt
      targets for the project's language and tools
- [ ] For JS/docs repos: `.prettierrc` and `.prettierignore` — fetch from
      `https://github.com/kjannette/LLM_DEV_PROMPTS/raw/branch/main/.prettierrc` and
      `https://github.com/kjannette/LLM_DEV_PROMPTS/raw/branch/main/.prettierignore`

## Create Project Files

- [ ] `LICENSE` file matching the chosen license
- [ ] `REPO_POLICIES.md` — fetch from
      `https://github.com/kjannette/LLM_DEV_PROMPTS/raw/branch/main/prompts/REPO_POLICIES.md`
- [ ] `Dockerfile` and `.dockerignore` — fetch `.dockerignore` from
      `https://github.com/kjannette/LLM_DEV_PROMPTS/raw/branch/main/.dockerignore`
    - All Dockerfiles must run `make check` as a build step
    - Server: also builds and runs the application
    - Non-server: brings up dev environment and runs `make check`
    - Image pinned by sha256 hash with version/date comment
- [ ] Language-specific:
    - [ ] Go: `go mod init sjdev.co/go/<name>`, `.golangci.yml`
    - [ ] JS: `npm init`, `npm i --dev prettier`
    - [ ] Python: `pyproject.toml`

## Configure Makefile

- [ ] `make test` — runs real tests, not a no-op (30-second timeout)
- [ ] `make lint` — runs linter
- [ ] `make fmt` — formats code (writes)
- [ ] `make fmt-check` — checks formatting (read-only)
- [ ] `make check` — prereqs: `test`, `lint`, `fmt-check`; must not modify files
- [ ] `make docker` — builds Docker image
- [ ] `make hooks` — installs pre-commit hook

# 4. Verify

- [ ] `make check` passes
- [ ] `make docker` succeeds
- [ ] No exposed secrets in repo
- [ ] No mutable image/package references
- [ ] No unnecessary files in repo root
- [ ] All dates written as YYYY-MM-DD

# 5. Merge and Set Up

- [ ] Commit, merge to `main`
- [ ] `make hooks` to install pre-commit hook
- [ ] Add remote and push
- [ ] Verify `main` passes `make check`
