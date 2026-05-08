.PHONY: test lint fmt fmt-check check docker hooks

# flags are repeated here (also in .prettierrc) so this Makefile works
# standalone when copied as a template
PRETTIER := yarn run prettier

test:
	@echo "No tests defined."

lint:
	@echo "Linting markdown files..."
	@$(PRETTIER) --check '**/*.md' --tab-width 4 --prose-wrap always

fmt:
	@$(PRETTIER) --write '**/*.md' --tab-width 4 --prose-wrap always

fmt-check:
	@$(PRETTIER) --check '**/*.md' --tab-width 4 --prose-wrap always

check: test lint fmt-check

docker:
	docker build -t prompts .

hooks:
	@printf '#!/bin/sh\nset -e\n' > .git/hooks/pre-commit
	@if [ -f go.mod ]; then \
		printf 'go mod tidy\ngo fmt ./...\ngit diff --exit-code -- go.mod go.sum || { echo "go mod tidy changed files; please stage and retry"; exit 1; }\n' >> .git/hooks/pre-commit; \
	fi
	@printf 'make check\n' >> .git/hooks/pre-commit
	@chmod +x .git/hooks/pre-commit
