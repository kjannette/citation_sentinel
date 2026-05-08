---
title: Code Styleguide — Python
last_modified: 2026-02-22
---

1. Standard Project Layout.  Use the src/ layout to prevent accidental imports from the root and ensure your project behaves like an installed package:

my_project/
├── pyproject.toml      # Modern tool & dependency configuration
├── README.md           # Instructions for humans
├── LICENSE             # Usage rights
├── .gitignore          # Exclude venv/, __pycache__/, .env
├── src/
│   └── my_project/     # Main package
│       ├── __init__.py
│       ├── main.py     # Minimal entry point logic
│       └── core.py     # Business logic
├── tests/              # Mirror src structure for testing
└── docs/               # Technical documentation

2. Virtual Environments: Always isolate project dependencies using venv or pyenv to avoid conflicts with system-wide packages.

3. Adhere to PEP 8: Use 4 spaces for indentation (no tabs), limit lines to 79 characters, and use two blank lines between top-level functions.

4. Put code in functions. If you are writing a script, put the script in a
function called `main` and call `main()` at the end of the script using the
standard invocation:

    ```python
    if __name__ == "__main__":
        main()
    ```
5. Keep main.py Boring: The entry point should only orchestrate (load config, start app). Heavy business logic should live in specialized modules.

6. Config Isolation: Never hardcode secrets or database URLs. Use a .env file with libraries like python-dotenv or Pydantic Settings.

7. Logging over Printing: Use Python’s built-in logging module to track errors and application state in production.

8. Test-First: Treat your tests/ directory as first-class code. Use pytest for its powerful features and simple syntax.

9. Naming Conventions: Use snake_case for functions and variables, PascalCase for classes, and UPPER_CASE for constants.

10. pyproject.toml: Use this as the single source of truth for project metadata and tool configurations (replaces setup.py).

11. Modular Design: Group code by domain (e.g., /users, /payments) rather than function (e.g., utils.py) to maintain separation of concerns.

# Author

[@sjdev](https://sjdev.co)
&lt;[sj@sjdev.co](mailto:sj@sjdev.berlin)&gt;

# License

MIT. See [LICENSE](../LICENSE).
