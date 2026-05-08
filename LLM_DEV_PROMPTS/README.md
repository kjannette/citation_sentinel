# LLM Development Prompts

An MIT-licensed collection of LLM prompts by [@sjdev](https://sjdev.co), intended for use in bootstrapping new projects or building out new features in existing codebases.

The prompts set forth best practices and procedural directives that must be followed in architecture and development. Think of this repo as akin to the Chicago Manual of Style, AP Stylebook (for journalism), or The ALWD Guide to Legal Citation.

The prompts include 1) general repository development standards and 2) language and framework-specific development directives, intended to be reviewed by the code-building model at the outset work and followed throughout the work’s progress.  For example, the Javascript code styleguide sets forth the simple directive: “[u]se const for all declarations, unless you need to reassign, then use let. Never use var.”  

These prompts are a work in progress.  I add to them as I work on new projects in new languages and frameworks, and I am also still in the process of memorializing prompts relating to languages and frameworks I have used for many years.

# Usage - generally

Imagine the scenario: you, as a developer, are tasked with adding a new feature to an existing codebase, with maximum automation via LLM code generation.  At the outset, before adressing the substantive implementation, you would run the following prompt (discussed in greater detail below):

Read $TD/prompts/REPO_POLICIES.md and $TD/prompts/EXISTING_REPO_CHECKLIST.md, then bring this repo up to those
standards. Your scope is repo scaffolding and policy compliance: Makefile, Dockerfile, .dockerignore, .gitignore, .editorconfig, CI
workflow, README sections, LICENSE, REPO_POLICIES.md, and any language-specific config files (.golangci.yml, .prettierrc, etc.).

## Quick Start - optional scripts for cli agent

### Existing Repo

Run from within the repo you want to bring up to standard. Clone the prompts repo once, then run both commands in order.

```bash
export TD="$(mktemp -d)"
git clone --depth 1 https://github.com/kjannette/LLM_DEV_PROMPTS.git "$TD"
```

**Repository structure and policies:**

```bash
claude "Read $TD/prompts/REPO_POLICIES.md and
$TD/prompts/EXISTING_REPO_CHECKLIST.md, then bring this repo up to those
standards. Your scope is repo scaffolding and policy compliance:
Makefile, Dockerfile, .dockerignore, .gitignore, .editorconfig, CI
workflow, README sections, LICENSE, REPO_POLICIES.md, and any
language-specific config files (.golangci.yml, .prettierrc, etc.).
You must also run the formatter (make fmt) and fix any linter errors
(make lint) so that make check passes — this will touch source code,
but do not restructure, refactor, or rewrite any application logic.
Follow the policies yourself: work on a feature branch, never git add -A,
and make each logical change a separate commit (e.g. one commit for
formatting, one for linter fixes, one for README updates, one for each
new repo file added, etc.)."
```

**Code style and conventions:**

```bash
claude "Read $TD/prompts/CODE_STYLEGUIDE.md and whichever
language-specific styleguides in $TD/prompts/ apply to this repo
(CODE_STYLEGUIDE_GO.md, CODE_STYLEGUIDE_JS.md, CODE_STYLEGUIDE_PYTHON.md,
GO_HTTP_SERVER_CONVENTIONS.md). Then review the application code in this
repo and bring it into compliance with those coding standards. Your scope
is application code structure and style: naming, patterns, error
handling, project layout, and conventions described in the styleguides.
Do not modify repo scaffolding (Makefile, Dockerfile, CI workflow,
.gitignore, .editorconfig, etc.) — only application code. Work on a
feature branch, never git add -A, and make each logical change a
separate commit."
```

### New Repo

Run from inside the directory where you want to create a new repo. Clone the
prompts repo once, then run both commands in order.

```bash
export TD="$(mktemp -d)"
git clone --depth 1 https://github.com/kjannette/LLM_DEV_PROMPTS.git "$TD"
```

**Repository scaffolding:**

```bash
claude "Read $TD/prompts/REPO_POLICIES.md and
$TD/prompts/NEW_REPO_CHECKLIST.md, then set up this new repo according
to those standards. Your scope is repo structure and required files:
README.md, LICENSE, REPO_POLICIES.md, Makefile, Dockerfile, .dockerignore,
.gitignore, .editorconfig, CI workflow, and language-specific config.
Run the formatter (make fmt) and fix any linter errors (make lint) so
that make check passes — this will touch source code, but do not
restructure, refactor, or rewrite any application logic. Follow the
policies yourself: work on a feature branch, never git add -A, and make
each logical change a separate commit (e.g. one commit for formatting,
one for linter fixes, one for README, one for each new repo file, etc.)."
```

**Code style and conventions:**

```bash
claude "Read $TD/prompts/CODE_STYLEGUIDE.md and whichever
language-specific styleguides in $TD/prompts/ apply to this repo
(CODE_STYLEGUIDE_GO.md, CODE_STYLEGUIDE_JS.md, CODE_STYLEGUIDE_PYTHON.md,
GO_HTTP_SERVER_CONVENTIONS.md). Then review the application code in this
repo and bring it into compliance with those coding standards. Your scope
is application code structure and style: naming, patterns, error
handling, project layout, and conventions described in the styleguides.
Do not modify repo scaffolding (Makefile, Dockerfile, CI workflow,
.gitignore, .editorconfig, etc.) — only application code. Work on a
feature branch, never git add -A, and make each logical change a
separate commit."
```

## Getting Started

```bash
git clone https://github.com/kjannette/LLM_DEV_PROMPTS.git
cd prompts
```

Prompts are stored as Markdown files in `prompts/`. Copy or reference them as
needed in your projects.

## Rationale

LLM prompts, especially development policies, benefit from version control and a
single authoritative source. This repo provides a central place to maintain,
share, and evolve prompts across projects.

## Design

The repository is a collection of Markdown files organized in the `prompts/`
subdirectory. Each file contains one or more related prompts or policy
documents. There is no build step or runtime component; the prompts are consumed
by copying them into other projects or referencing them directly.

## TODO

- Add more prompt templates for common development tasks

## License

MIT. See [LICENSE](LICENSE).

## Author

[@sjdev](https://sjdev.co)
