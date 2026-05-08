---
title: Code Styleguide
last_modified: 2026-02-22
---

# All

1. Every repo must have a `Makefile` and a `Dockerfile`. See
   [Repository Policies](https://github.com/kjannette/LLM_DEV_PROMPTS/raw/branch/main/prompts/REPO_POLICIES.md)
   for required targets and conventions.

2. Credentials and/or secrets should never be committed to any repository, even private ones. Store secrets in environment variables, and if they are absolutely required, check on startup to make sure they are set/non-default and complain loudly if not. Exception, sometimes: public keys. (Public keys can still sometimes be secrets for operational security reasons.)

3. KISS & DRY: Keep it simple, stupid (KISS) and Don't Repeat Yourself (DRY) to minimize complexity and technical debt.

4. Composition over Inheritance: Prefer combining simple objects to build complex ones rather than creating deep class hierarchies.

5. Avoid nesting `if` statements. If you have more than one level of nesting,
   consider inverting the condition and using `return` to exit early.

6. Almost all services/servers should accept their configuration via environment
   variables. Only go full config file if absolutely necessary.

7. For services/servers, log JSON to stdout. This makes it easier to parse and
   aggregate logs when run under `docker`. Use structured logging whenever
   possible. You may detect if the output is a terminal and pretty-print the
   logs in that case.

8. Debug mode is enabled by setting the environment variable `DEBUG` to a
   non-empty string. This should enable verbose logging and such. It will never
   be enabled in prod.

9. For services/servers, make a healthcheck available at
   `/.well-known/healthcheck`. The response must have a
   `Content-Type: application/json` header and return a JSON object containing
   the service's name, uptime, and a key of `"status"` with a value of `"ok"`.
   Return a 200 for healthy, 5xx for unhealthy.

10. If possible, for services/servers, include a /metrics endpoint that returns
    Prometheus-formatted metrics. This is not required for all services, but is a
    nice-to-have.

# Bash / Shell

1. Use `[[` instead of `[` for conditionals. 

2. Use `$( )` instead of backticks.

3. Use `#!/usr/bin/env bash` as the shebang line. This allows the script to be
   run on systems where `bash` is not in `/bin`.

4. Use `set -euo pipefail` at the top of every script. This will cause the
   script to exit if any command fails, or if a variable is used before it is set.

5. Use `pv` for progress bars when piping data through a command.

6. Put all code in functions, even a main function. Define all functions then
   call main at the bottom of the file.

# Docker Containers (for services)

1. Use `runit` with `runsvinit` as the entrypoint for all containers. This
   allows for easy service management and logging. In startup scripts
   (`/etc/service/*/run`) in the container, put a `sleep 1` at the top of the
   script to avoid spiking the cpu in the case of a fast-exiting process (such
   as in an error condition). This also limits the maximum number of error
   messages in logs to 86400/day.

# Author

[@sjdev](https://sjdev.co)
&lt;[sj@sjdev.co(mailto:sj@sjdev.berlin)&gt;

# License

MIT. See [LICENSE](../LICENSE).
