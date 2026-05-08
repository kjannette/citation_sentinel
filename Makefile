.PHONY: test lint fmt fmt-check check docker hooks dev run build clean

SERVER_DIR := server
WEB_DIR := client
TIMEOUT := 30

test:
	cd $(SERVER_DIR) && npx --no-install vitest run --reporter verbose --testTimeout $(TIMEOUT)000

lint:
	cd $(SERVER_DIR) && npx --no-install eslint src/
	cd $(WEB_DIR) && npx --no-install eslint src/

fmt:
	npx --no-install prettier --write .

fmt-check:
	npx --no-install prettier --check .

check: test lint fmt-check

docker:
	docker build -t notebook-clone .

hooks:
	printf '#!/usr/bin/env bash\nset -euo pipefail\nmake check\n' > .git/hooks/pre-commit
	chmod +x .git/hooks/pre-commit

dev:
	@echo "Starting backend and frontend..."
	cd $(SERVER_DIR) && node src/index.js &
	cd $(WEB_DIR) && npx --no-install vite --port 5173 &
	wait

run:
	cd $(SERVER_DIR) && node src/index.js

build:
	cd $(WEB_DIR) && npx --no-install vite build

clean:
	rm -rf $(WEB_DIR)/dist $(SERVER_DIR)/dist
