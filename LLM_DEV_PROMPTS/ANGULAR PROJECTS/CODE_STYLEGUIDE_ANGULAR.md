You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices
1. Use strict type checking
2. Prefer type inference when the type is obvious
3. Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices
1. Always use standalone components over NgModules
2. Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
3. Use signals for state management
4. Implement lazy loading for feature routes
5. Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
6. Use `NgOptimizedImage` for all static images.
7. Note: `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements
1. It MUST pass all AXE checks.
2. It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components
1. Keep components small and focused on a single responsibility
2. Use `input()` and `output()` functions instead of decorators
3. Use `computed()` for derived state
4. Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
5. Prefer inline templates for small components
6. Prefer Reactive forms instead of Template-driven ones
7. Do NOT use `ngClass`, use `class` bindings instead
8. Do NOT use `ngStyle`, use `style` bindings instead
9. When using external templates/styles, use paths relative to the component TS file.

## State Management
1. Use signals for local component state
2. Use `computed()` for derived state
3. Keep state transformations pure and predictable
4. Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates
1. Keep templates simple and avoid complex logic
2. Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
3. Use the async pipe to handle observables
4. Do not assume globals like (`new Date()`) are available.

## Services
1. Design services around a single responsibility
2. Use the `providedIn: 'root'` option for singleton services
3. Use the `inject()` function instead of constructor injection