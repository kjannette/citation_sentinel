---
title: Existing Repo Checklist
last_modified: 2026-02-22
---

Use this checklist when starting work in a repo that may not conform to our repo policies.

Plan first.  Structure work into discreet tasks, according to well-defined acceptance critera. Work on a feature branch for each work item. 

**Always check your work** and fix gaps between it and the policies and acceptance creiteria before proceeding with the next task.

# Formatting (do this first)

- [ ] If the repo has never been formatted to our standards, run `make fmt` and
      commit the result as a standalone branch/PR before any other
      changes. Formatting diffs can be large and should not be mixed with
      functional changes.

# Required Files

- [ ] `README.md` exists with all required sections (Description, Getting
      Started, Rationale, Design, TODO, License, Author)
- [ ] `LICENSE` file exists and matches the README
- [ ] `REPO_POLICIES.md` exists and version date is current — fetch from
      `https://github.com/kjannette/LLM_DEV_PROMPTS/blob/master/REPO_POLICIES.md`
- [ ] `.gitignore` is comprehensive (OS, editor, language artifacts, secrets) —
      fetch from `https://github.com/kjannette/LLM_DEV_PROMPTS/blob/master/.gitignore`
      if missing
- [ ] `Dockerfile` and `.dockerignore` exist; Dockerfile runs `make check` as a
      build step — fetch `.dockerignore` from
      `https://github.com/kjannette/LLM_DEV_PROMPTS/blob/master/.dockerignore`
- [ ] Language-specific config:
    - [ ] Go: `go.mod`, `go.sum`, `.golangci.yml` (fetch from
          `https://github.com/kjannette/LLM_DEV_PROMPTS/raw/branch/main/.golangci.yml`)
    - [ ] JS: `package.json`, `yarn.lock`, `.prettierrc`, `.prettierignore`
          (fetch from
          `https://github.com/kjannette/LLM_DEV_PROMPTS/raw/branch/main/.prettierrc` and
          `https://github.com/kjannette/LLM_DEV_PROMPTS/raw/branch/main/.prettierignore`)
    - [ ] Python: `pyproject.toml`
    - [ ] Docs/writing: `.prettierrc`, `.prettierignore` (same URLs as above)

# Makefile

- [ ] `Makefile` exists in root — reference
      `https://github.com/kjannette/LLM_DEV_PROMPTS/blob/master/Makefile`
- [ ] Has targets: `test`, `lint`, `fmt`, `fmt-check`, `check`, `docker`,
      `hooks`
- [ ] `make check` does not modify any files in the repo
- [ ] `make test` has a 30-second timeout
- [ ] `make test` runs real tests, not a no-op (at minimum, import/compile
      check)
- [ ] `make check` passes on current branch

# Formatting

- [ ] Platform-standard formatter is configured (`black`, `prettier`, `go fmt`)
- [ ] Default formatter config, only exception: four-space indents (except Go)
- [ ] All files pass `make fmt-check`

# Git Hygiene

- [ ] Pre-commit hook is installed (`make hooks`)
- [ ] No secrets in the repo (`.env`, keys, credentials)
- [ ] No mutable references in Dockerfiles or scripts (tags, `@latest`) — all
      pinned by cryptographic hash with version/date comment
- [ ] Using `yarn`, not `npm` (JS projects)

# Directory Structure

- [ ] No unnecessary files in repo root
- [ ] Files organized into canonical subdirectories (`bin/`, `cmd/`, `docs/`,
      `internal/`, `static/`, etc.)
- [ ] Go migrations in `internal/db/migrations/` and embedded in binary

# Final

- [ ] `make check` passes
- [ ] `docker build` succeeds
- [ ] Commit and merge fixes before starting your actual task
