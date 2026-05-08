---
title: Go HTTP Server Conventions
last_modified: 2026-02-22
---

This document defines the architectural patterns, design decisions, and
conventions for building Go HTTP servers. All new projects must follow these
standards.

# Table of Contents

1. [Required Libraries](#1-required-libraries)
2. [Project Structure](#2-project-structure)
3. [Dependency Injection (Uber fx)](#3-dependency-injection-uber-fx)
4. [Server Architecture](#4-server-architecture)
5. [Routing (go-chi)](#5-routing-go-chi)
6. [Handler Conventions](#6-handler-conventions)
7. [Middleware Conventions](#7-middleware-conventions)
8. [Configuration (Viper)](#8-configuration-viper)
9. [Logging (slog)](#9-logging-slog)
10. [Database Wrapper](#10-database-wrapper)
11. [Globals Package](#11-globals-package)
12. [Static Assets & Templates](#12-static-assets--templates)
13. [Health Check](#13-health-check)
14. [External Integrations](#14-external-integrations)

---

# 1. Required Libraries

These libraries are **mandatory** for all new projects:

| Purpose              | Library         | Import Path                           |
| -------------------- | --------------- | ------------------------------------- |
| Dependency Injection | Uber fx         | `go.uber.org/fx`                      |
| HTTP Router          | go-chi          | `github.com/go-chi/chi`               |
| Logging              | slog (stdlib)   | `log/slog`                            |
| Configuration        | Viper           | `github.com/spf13/viper`              |
| Environment Loading  | godotenv        | `github.com/joho/godotenv/autoload`   |
| CORS                 | go-chi/cors     | `github.com/go-chi/cors`              |
| Error Reporting      | Sentry          | `github.com/getsentry/sentry-go`      |
| Metrics              | Prometheus      | `github.com/prometheus/client_golang` |
| Metrics Middleware   | go-http-metrics | `github.com/slok/go-http-metrics`     |
| Basic Auth           | basicauth-go    | `github.com/99designs/basicauth-go`   |

---

# 2. Project Structure

```
project-root/
├── cmd/
│   └── {appname}/
│       └── main.go           # Entry point
├── internal/
│   ├── config/
│   │   └── config.go         # Configuration loading
│   ├── database/
│   │   └── database.go       # Database wrapper
│   ├── globals/
│   │   └── globals.go        # Build-time variables
│   ├── handlers/
│   │   ├── handlers.go       # Base handler struct and helpers
│   │   ├── index.go          # Individual handlers...
│   │   ├── healthcheck.go
│   │   └── {feature}.go
│   ├── healthcheck/
│   │   └── healthcheck.go    # Health check service
│   ├── logger/
│   │   └── logger.go         # Logger setup
│   ├── middleware/
│   │   └── middleware.go     # All middleware definitions
│   └── server/
│       ├── server.go         # Server struct and lifecycle
│       ├── http.go           # HTTP server setup
│       └── routes.go         # Route definitions
├── static/
│   ├── static.go             # Embed directive
│   ├── css/
│   └── js/
├── templates/
│   ├── templates.go          # Embed and parse
│   └── *.html
├── go.mod
├── go.sum
├── Makefile
└── Dockerfile
```

## Key Principles

- **`cmd/{appname}/`**: Only the entry point. Minimal logic, just bootstrapping.
- **`internal/`**: All application packages. Not importable by external
  projects.
- **One package per concern**: config, database, handlers, middleware, etc.
- **Flat handler files**: One file per handler or logical group of handlers.

---

# 3. Dependency Injection (Uber fx)

## Entry Point Pattern

```go
// cmd/httpd/main.go
package main

import (
    "yourproject/internal/config"
    "yourproject/internal/database"
    "yourproject/internal/globals"
    "yourproject/internal/handlers"
    "yourproject/internal/healthcheck"
    "yourproject/internal/logger"
    "yourproject/internal/middleware"
    "yourproject/internal/server"
    "go.uber.org/fx"
)

var (
    Appname   string = "CHANGEME"
    Version   string
    Buildarch string
)

func main() {
    globals.Appname = Appname
    globals.Version = Version
    globals.Buildarch = Buildarch

    fx.New(
        fx.Provide(
            config.New,
            database.New,
            globals.New,
            handlers.New,
            logger.New,
            server.New,
            middleware.New,
            healthcheck.New,
        ),
        fx.Invoke(func(*server.Server) {}),
    ).Run()
}
```

## Params Struct Pattern

Every component that receives dependencies uses a params struct with `fx.In`:

```go
type HandlersParams struct {
    fx.In
    Logger      *logger.Logger
    Globals     *globals.Globals
    Database    *database.Database
    Healthcheck *healthcheck.Healthcheck
}

type Handlers struct {
    params *HandlersParams
    log    *slog.Logger
    hc     *healthcheck.Healthcheck
}
```

## Factory Function Pattern

All components expose a `New` function with this signature:

```go
func New(lc fx.Lifecycle, params SomeParams) (*Something, error) {
    s := new(Something)
    s.params = &params
    s.log = params.Logger.Get()

    lc.Append(fx.Hook{
        OnStart: func(ctx context.Context) error {
            // Initialize resources
            return nil
        },
        OnStop: func(ctx context.Context) error {
            // Cleanup resources
            return nil
        },
    })
    return s, nil
}
```

## Dependency Order

Providers are resolved automatically by fx, but conceptually follow this order:

1. `globals.New` - Build-time variables (no dependencies)
2. `logger.New` - Logger (depends on Globals)
3. `config.New` - Configuration (depends on Globals, Logger)
4. `database.New` - Database (depends on Logger, Config)
5. `healthcheck.New` - Health check (depends on Globals, Config, Logger,
   Database)
6. `middleware.New` - Middleware (depends on Logger, Globals, Config)
7. `handlers.New` - Handlers (depends on Logger, Globals, Database, Healthcheck)
8. `server.New` - Server (depends on all above)

---

# 4. Server Architecture

## Server Struct

The Server struct is the central orchestrator:

```go
// internal/server/server.go
type ServerParams struct {
    fx.In
    Logger     *logger.Logger
    Globals    *globals.Globals
    Config     *config.Config
    Middleware *middleware.Middleware
    Handlers   *handlers.Handlers
}

type Server struct {
    startupTime   time.Time
    port          int
    exitCode      int
    sentryEnabled bool
    log           *slog.Logger
    ctx           context.Context
    cancelFunc    context.CancelFunc
    httpServer    *http.Server
    router        *chi.Mux
    params        ServerParams
    mw            *middleware.Middleware
    h             *handlers.Handlers
}
```

## Server Factory

```go
func New(lc fx.Lifecycle, params ServerParams) (*Server, error) {
    s := new(Server)
    s.params = params
    s.mw = params.Middleware
    s.h = params.Handlers
    s.log = params.Logger.Get()

    lc.Append(fx.Hook{
        OnStart: func(ctx context.Context) error {
            s.startupTime = time.Now()
            go s.Run()
            return nil
        },
        OnStop: func(ctx context.Context) error {
            // Server shutdown logic
            return nil
        },
    })
    return s, nil
}
```

## HTTP Server Setup

```go
// internal/server/http.go
func (s *Server) serveUntilShutdown() {
    listenAddr := fmt.Sprintf(":%d", s.params.Config.Port)
    s.httpServer = &http.Server{
        Addr:           listenAddr,
        ReadTimeout:    10 * time.Second,
        WriteTimeout:   10 * time.Second,
        MaxHeaderBytes: 1 << 20,
        Handler:        s,
    }

    s.SetupRoutes()

    s.log.Info("http begin listen", "listenaddr", listenAddr)
    if err := s.httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
        s.log.Error("listen error", "error", err)
        if s.cancelFunc != nil {
            s.cancelFunc()
        }
    }
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    s.router.ServeHTTP(w, r)
}
```

## Signal Handling and Graceful Shutdown

```go
func (s *Server) serve() int {
    s.ctx, s.cancelFunc = context.WithCancel(context.Background())

    // Signal watcher
    go func() {
        c := make(chan os.Signal, 1)
        signal.Ignore(syscall.SIGPIPE)
        signal.Notify(c, os.Interrupt, syscall.SIGTERM)
        sig := <-c
        s.log.Info("signal received", "signal", sig)
        if s.cancelFunc != nil {
            s.cancelFunc()
        }
    }()

    go s.serveUntilShutdown()

    for range s.ctx.Done() {
    }
    s.cleanShutdown()
    return s.exitCode
}

func (s *Server) cleanShutdown() {
    s.exitCode = 0
    ctxShutdown, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
    if err := s.httpServer.Shutdown(ctxShutdown); err != nil {
        s.log.Error("server clean shutdown failed", "error", err)
    }
    if shutdownCancel != nil {
        shutdownCancel()
    }
    s.cleanupForExit()
    if s.sentryEnabled {
        sentry.Flush(2 * time.Second)
    }
}
```

---

# 5. Routing (go-chi)

## Route Setup Pattern

```go
// internal/server/routes.go
func (s *Server) SetupRoutes() {
    s.router = chi.NewRouter()

    // Global middleware (applied to all routes)
    s.router.Use(middleware.Recoverer)
    s.router.Use(middleware.RequestID)
    s.router.Use(s.mw.Logging())

    // Conditional middleware
    if viper.GetString("METRICS_USERNAME") != "" {
        s.router.Use(s.mw.Metrics())
    }

    s.router.Use(s.mw.CORS())
    s.router.Use(middleware.Timeout(60 * time.Second))

    if s.sentryEnabled {
        sentryHandler := sentryhttp.New(sentryhttp.Options{
            Repanic: true,
        })
        s.router.Use(sentryHandler.Handle)
    }

    // Routes
    s.router.Get("/", s.h.HandleIndex())

    // Static files
    s.router.Mount("/s", http.StripPrefix("/s", http.FileServer(http.FS(static.Static))))

    // API versioning
    s.router.Route("/api/v1", func(r chi.Router) {
        r.Get("/now", s.h.HandleNow())
    })

    // Routes with specific middleware
    auth := s.mw.Auth()
    s.router.Get("/login", auth(s.h.HandleLoginGET()).ServeHTTP)

    // Health check (standard path)
    s.router.Get("/.well-known/healthcheck", s.h.HandleHealthCheck())

    // Protected route groups
    if viper.GetString("METRICS_USERNAME") != "" {
        s.router.Group(func(r chi.Router) {
            r.Use(s.mw.MetricsAuth())
            r.Get("/metrics", http.HandlerFunc(promhttp.Handler().ServeHTTP))
        })
    }
}
```

## Middleware Ordering (Critical)

1. `middleware.Recoverer` - Panic recovery (must be first)
2. `middleware.RequestID` - Generate request IDs
3. `s.mw.Logging()` - Request logging
4. `s.mw.Metrics()` - Prometheus metrics (if enabled)
5. `s.mw.CORS()` - CORS headers
6. `middleware.Timeout(60s)` - Request timeout
7. `sentryhttp.Handler` - Sentry error reporting (if enabled)

## API Versioning

Use route groups for API versioning:

```go
s.router.Route("/api/v1", func(r chi.Router) {
    r.Get("/resource", s.h.HandleResource())
})
```

## Static File Serving

Static files are served at `/s/` prefix:

```go
s.router.Mount("/s", http.StripPrefix("/s", http.FileServer(http.FS(static.Static))))
```

---

# 6. Handler Conventions

## Handler Base Struct

```go
// internal/handlers/handlers.go
type HandlersParams struct {
    fx.In
    Logger      *logger.Logger
    Globals     *globals.Globals
    Database    *database.Database
    Healthcheck *healthcheck.Healthcheck
}

type Handlers struct {
    params *HandlersParams
    log    *slog.Logger
    hc     *healthcheck.Healthcheck
}

func New(lc fx.Lifecycle, params HandlersParams) (*Handlers, error) {
    s := new(Handlers)
    s.params = &params
    s.log = params.Logger.Get()
    s.hc = params.Healthcheck
    lc.Append(fx.Hook{
        OnStart: func(ctx context.Context) error {
            // Compile templates or other initialization
            return nil
        },
    })
    return s, nil
}
```

## Closure-Based Handler Pattern

All handlers return `http.HandlerFunc` using the closure pattern. This allows
initialization logic to run once when the handler is created:

```go
// internal/handlers/index.go
func (s *Handlers) HandleIndex() http.HandlerFunc {
    // Initialization runs once
    t := templates.GetParsed()

    // Handler runs per-request
    return func(w http.ResponseWriter, r *http.Request) {
        err := t.ExecuteTemplate(w, "index.html", nil)
        if err != nil {
            s.log.Error("template execution failed", "error", err)
            http.Error(w, http.StatusText(500), 500)
        }
    }
}
```

## JSON Handler Pattern

```go
// internal/handlers/now.go
func (s *Handlers) HandleNow() http.HandlerFunc {
    // Response struct defined in closure scope
    type response struct {
        Now time.Time `json:"now"`
    }
    return func(w http.ResponseWriter, r *http.Request) {
        s.respondJSON(w, r, &response{Now: time.Now()}, 200)
    }
}
```

## Response Helpers

```go
// internal/handlers/handlers.go
func (s *Handlers) respondJSON(w http.ResponseWriter, r *http.Request, data interface{}, status int) {
    w.WriteHeader(status)
    w.Header().Set("Content-Type", "application/json")
    if data != nil {
        err := json.NewEncoder(w).Encode(data)
        if err != nil {
            s.log.Error("json encode error", "error", err)
        }
    }
}

func (s *Handlers) decodeJSON(w http.ResponseWriter, r *http.Request, v interface{}) error {
    return json.NewDecoder(r.Body).Decode(v)
}
```

## Handler Naming Convention

- `HandleIndex()` - Main page
- `HandleLoginGET()` / `HandleLoginPOST()` - Form handlers with HTTP method
  suffix
- `HandleNow()` - API endpoints
- `HandleHealthCheck()` - System endpoints

---

# 7. Middleware Conventions

## Middleware Struct

```go
// internal/middleware/middleware.go
type MiddlewareParams struct {
    fx.In
    Logger  *logger.Logger
    Globals *globals.Globals
    Config  *config.Config
}

type Middleware struct {
    log    *slog.Logger
    params *MiddlewareParams
}

func New(lc fx.Lifecycle, params MiddlewareParams) (*Middleware, error) {
    s := new(Middleware)
    s.params = &params
    s.log = params.Logger.Get()
    return s, nil
}
```

## Middleware Signature

All custom middleware methods return `func(http.Handler) http.Handler`:

```go
func (s *Middleware) Auth() func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // Before request
            s.log.Info("AUTH: before request")

            next.ServeHTTP(w, r)

            // After request (optional)
        })
    }
}
```

## Logging Middleware with Status Capture

```go
type loggingResponseWriter struct {
    http.ResponseWriter
    statusCode int
}

func NewLoggingResponseWriter(w http.ResponseWriter) *loggingResponseWriter {
    return &loggingResponseWriter{w, http.StatusOK}
}

func (lrw *loggingResponseWriter) WriteHeader(code int) {
    lrw.statusCode = code
    lrw.ResponseWriter.WriteHeader(code)
}

func (s *Middleware) Logging() func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            start := time.Now()
            lrw := NewLoggingResponseWriter(w)
            ctx := r.Context()
            defer func() {
                latency := time.Since(start)
                s.log.InfoContext(ctx, "request",
                    "request_start", start,
                    "method", r.Method,
                    "url", r.URL.String(),
                    "useragent", r.UserAgent(),
                    "request_id", ctx.Value(middleware.RequestIDKey).(string),
                    "referer", r.Referer(),
                    "proto", r.Proto,
                    "remoteIP", ipFromHostPort(r.RemoteAddr),
                    "status", lrw.statusCode,
                    "latency_ms", latency.Milliseconds(),
                )
            }()
            next.ServeHTTP(lrw, r)
        })
    }
}
```

## CORS Middleware

```go
func (s *Middleware) CORS() func(http.Handler) http.Handler {
    return cors.Handler(cors.Options{
        AllowedOrigins:   []string{"*"},
        AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
        AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
        ExposedHeaders:   []string{"Link"},
        AllowCredentials: false,
        MaxAge:           300,
    })
}
```

## Metrics Middleware

```go
func (s *Middleware) Metrics() func(http.Handler) http.Handler {
    mdlw := ghmm.New(ghmm.Config{
        Recorder: metrics.NewRecorder(metrics.Config{}),
    })
    return func(next http.Handler) http.Handler {
        return std.Handler("", mdlw, next)
    }
}

func (s *Middleware) MetricsAuth() func(http.Handler) http.Handler {
    return basicauth.New(
        "metrics",
        map[string][]string{
            viper.GetString("METRICS_USERNAME"): {
                viper.GetString("METRICS_PASSWORD"),
            },
        },
    )
}
```

---

# 8. Configuration (Viper)

## Config Struct

```go
// internal/config/config.go
type ConfigParams struct {
    fx.In
    Globals *globals.Globals
    Logger  *logger.Logger
}

type Config struct {
    DBURL           string
    Debug           bool
    MaintenanceMode bool
    MetricsPassword string
    MetricsUsername string
    Port            int
    SentryDSN       string
    params          *ConfigParams
    log             *slog.Logger
}
```

## Configuration Loading

```go
func New(lc fx.Lifecycle, params ConfigParams) (*Config, error) {
    log := params.Logger.Get()
    name := params.Globals.Appname

    // Config file settings
    viper.SetConfigName(name)
    viper.SetConfigType("yaml")
    viper.AddConfigPath(fmt.Sprintf("/etc/%s", name))
    viper.AddConfigPath(fmt.Sprintf("$HOME/.config/%s", name))

    // Environment variables override everything
    viper.AutomaticEnv()

    // Defaults
    viper.SetDefault("DEBUG", "false")
    viper.SetDefault("MAINTENANCE_MODE", "false")
    viper.SetDefault("PORT", "8080")
    viper.SetDefault("DBURL", "")
    viper.SetDefault("SENTRY_DSN", "")
    viper.SetDefault("METRICS_USERNAME", "")
    viper.SetDefault("METRICS_PASSWORD", "")

    // Read config file (optional)
    if err := viper.ReadInConfig(); err != nil {
        if _, ok := err.(viper.ConfigFileNotFoundError); ok {
            // Config file not found is OK
        } else {
            log.Error("config file malformed", "error", err)
            panic(err)
        }
    }

    // Build config struct
    s := &Config{
        DBURL:           viper.GetString("DBURL"),
        Debug:           viper.GetBool("debug"),
        Port:            viper.GetInt("PORT"),
        SentryDSN:       viper.GetString("SENTRY_DSN"),
        MaintenanceMode: viper.GetBool("MAINTENANCE_MODE"),
        MetricsUsername: viper.GetString("METRICS_USERNAME"),
        MetricsPassword: viper.GetString("METRICS_PASSWORD"),
        log:             log,
        params:          &params,
    }

    // Enable debug logging if configured
    if s.Debug {
        params.Logger.EnableDebugLogging()
        s.log = params.Logger.Get()
    }

    return s, nil
}
```

## Configuration Precedence

1. **Environment variables** (highest priority via `AutomaticEnv()`)
2. **`.env` file** (loaded via `godotenv/autoload` import)
3. **Config files**: `/etc/{appname}/{appname}.yaml`,
   `~/.config/{appname}/{appname}.yaml`
4. **Defaults** (lowest priority)

## Environment Loading

Import godotenv with autoload to automatically load `.env` files:

```go
import (
    _ "github.com/joho/godotenv/autoload"
)
```

---

# 9. Logging (slog)

## Logger Struct

```go
// internal/logger/logger.go
type LoggerParams struct {
    fx.In
    Globals *globals.Globals
}

type Logger struct {
    log    *slog.Logger
    level  *slog.LevelVar
    params LoggerParams
}
```

## Logger Setup with TTY Detection

```go
func New(lc fx.Lifecycle, params LoggerParams) (*Logger, error) {
    l := new(Logger)
    l.level = new(slog.LevelVar)
    l.level.Set(slog.LevelInfo)

    // TTY detection for dev vs prod output
    tty := false
    if fileInfo, _ := os.Stdout.Stat(); (fileInfo.Mode() & os.ModeCharDevice) != 0 {
        tty = true
    }

    var handler slog.Handler
    if tty {
        // Text output for development
        handler = slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
            Level:     l.level,
            AddSource: true,
        })
    } else {
        // JSON output for production
        handler = slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
            Level:     l.level,
            AddSource: true,
        })
    }

    l.log = slog.New(handler)
    return l, nil
}
```

## Logger Methods

```go
func (l *Logger) EnableDebugLogging() {
    l.level.Set(slog.LevelDebug)
    l.log.Debug("debug logging enabled", "debug", true)
}

func (l *Logger) Get() *slog.Logger {
    return l.log
}

func (l *Logger) Identify() {
    l.log.Info("starting",
        "appname", l.params.Globals.Appname,
        "version", l.params.Globals.Version,
        "buildarch", l.params.Globals.Buildarch,
    )
}
```

## Logging Patterns

```go
// Info with fields
s.log.Info("message", "key", "value")

// Error with error object
s.log.Error("operation failed", "error", err)

// With context
s.log.InfoContext(ctx, "processing request", "request_id", reqID)

// Structured request logging
s.log.Info("request completed",
    "request_start", start,
    "method", r.Method,
    "url", r.URL.String(),
    "status", statusCode,
    "latency_ms", latency.Milliseconds(),
)

// Using slog.Group for nested attributes
s.log.Info("request",
    slog.Group("http",
        "method", r.Method,
        "url", r.URL.String(),
    ),
    slog.Group("timing",
        "start", start,
        "latency_ms", latency.Milliseconds(),
    ),
)
```

---

# 10. Database Wrapper

## Database Struct

```go
// internal/database/database.go
type DatabaseParams struct {
    fx.In
    Logger *logger.Logger
    Config *config.Config
}

type Database struct {
    URL    string
    log    *slog.Logger
    params *DatabaseParams
}
```

## Database Factory with Lifecycle

```go
func New(lc fx.Lifecycle, params DatabaseParams) (*Database, error) {
    s := new(Database)
    s.params = &params
    s.log = params.Logger.Get()

    s.log.Info("Database instantiated")

    lc.Append(fx.Hook{
        OnStart: func(ctx context.Context) error {
            s.log.Info("Database OnStart Hook")
            // Connect to database here
            // Example: s.db, err = sql.Open("postgres", s.params.Config.DBURL)
            return nil
        },
        OnStop: func(ctx context.Context) error {
            // Disconnect from database here
            // Example: s.db.Close()
            return nil
        },
    })
    return s, nil
}
```

## Usage Pattern

The Database struct is injected into handlers and other services:

```go
type HandlersParams struct {
    fx.In
    Database *database.Database
    // ...
}

// Access in handler
func (s *Handlers) HandleSomething() http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        // Use s.params.Database
    }
}
```

---

# 11. Globals Package

## Package Variables and Struct

```go
// internal/globals/globals.go
package globals

import "go.uber.org/fx"

// Package-level variables (set from main)
var (
    Appname   string
    Version   string
    Buildarch string
)

// Struct for DI
type Globals struct {
    Appname   string
    Version   string
    Buildarch string
}

func New(lc fx.Lifecycle) (*Globals, error) {
    n := &Globals{
        Appname:   Appname,
        Buildarch: Buildarch,
        Version:   Version,
    }
    return n, nil
}
```

## Setting Globals in Main

```go
// cmd/httpd/main.go
var (
    Appname   string = "CHANGEME"  // Default, overridden by build
    Version   string               // Set at build time
    Buildarch string               // Set at build time
)

func main() {
    globals.Appname = Appname
    globals.Version = Version
    globals.Buildarch = Buildarch
    // ...
}
```

## Build-Time Variable Injection

Use ldflags to inject version information at build time:

```makefile
VERSION := $(shell git describe --tags --always)
BUILDARCH := $(shell go env GOARCH)

build:
    go build -ldflags "-X main.Version=$(VERSION) -X main.Buildarch=$(BUILDARCH)" ./cmd/httpd
```

---

# 12. Static Assets & Templates

## Static File Embedding

```go
// static/static.go
package static

import "embed"

//go:embed css js
var Static embed.FS
```

Directory structure:

```
static/
├── static.go
├── css/
│   ├── bootstrap-4.5.3.min.css
│   └── style.css
└── js/
    ├── bootstrap-4.5.3.bundle.min.js
    └── jquery-3.5.1.slim.min.js
```

## Template Embedding and Lazy Parsing

```go
// templates/templates.go
package templates

import (
    "embed"
    "text/template"
)

//go:embed *.html
var TemplatesRaw embed.FS
var TemplatesParsed *template.Template

func GetParsed() *template.Template {
    if TemplatesParsed == nil {
        TemplatesParsed = template.Must(template.ParseFS(TemplatesRaw, "*"))
    }
    return TemplatesParsed
}
```

## Template Composition

Templates use Go's template composition:

```html
<!-- index.html -->
{{ template "htmlheader.html" . }} {{ template "navbar.html" . }}

<main>
    <!-- Page content -->
</main>

{{ template "pagefooter.html" . }} {{ template "htmlfooter.html" . }}
```

## Static Asset References

Reference static files with `/s/` prefix:

```html
<link rel="stylesheet" href="/s/css/bootstrap-4.5.3.min.css" />
<link rel="stylesheet" href="/s/css/style.css" />
<script src="/s/js/jquery-3.5.1.slim.min.js"></script>
```

---

# 13. Health Check

## Health Check Service

```go
// internal/healthcheck/healthcheck.go
type HealthcheckParams struct {
    fx.In
    Globals  *globals.Globals
    Config   *config.Config
    Logger   *logger.Logger
    Database *database.Database
}

type Healthcheck struct {
    StartupTime time.Time
    log         *slog.Logger
    params      *HealthcheckParams
}

func New(lc fx.Lifecycle, params HealthcheckParams) (*Healthcheck, error) {
    s := new(Healthcheck)
    s.params = &params
    s.log = params.Logger.Get()

    lc.Append(fx.Hook{
        OnStart: func(ctx context.Context) error {
            s.StartupTime = time.Now()
            return nil
        },
        OnStop: func(ctx context.Context) error {
            return nil
        },
    })
    return s, nil
}
```

## Health Check Response

```go
type HealthcheckResponse struct {
    Status        string `json:"status"`
    Now           string `json:"now"`
    UptimeSeconds int64  `json:"uptime_seconds"`
    UptimeHuman   string `json:"uptime_human"`
    Version       string `json:"version"`
    Appname       string `json:"appname"`
    Maintenance   bool   `json:"maintenance_mode"`
}

func (s *Healthcheck) uptime() time.Duration {
    return time.Since(s.StartupTime)
}

func (s *Healthcheck) Healthcheck() *HealthcheckResponse {
    resp := &HealthcheckResponse{
        Status:        "ok",
        Now:           time.Now().UTC().Format(time.RFC3339Nano),
        UptimeSeconds: int64(s.uptime().Seconds()),
        UptimeHuman:   s.uptime().String(),
        Appname:       s.params.Globals.Appname,
        Version:       s.params.Globals.Version,
    }
    return resp
}
```

## Standard Endpoint

Health check is served at the standard `.well-known` path:

```go
s.router.Get("/.well-known/healthcheck", s.h.HandleHealthCheck())
```

---

# 14. External Integrations

## Sentry Error Reporting

Sentry is conditionally enabled based on `SENTRY_DSN` environment variable:

```go
func (s *Server) enableSentry() {
    s.sentryEnabled = false

    if s.params.Config.SentryDSN == "" {
        return
    }

    err := sentry.Init(sentry.ClientOptions{
        Dsn:     s.params.Config.SentryDSN,
        Release: fmt.Sprintf("%s-%s", s.params.Globals.Appname, s.params.Globals.Version),
    })
    if err != nil {
        s.log.Error("sentry init failure", "error", err)
        os.Exit(1)
        return
    }
    s.log.Info("sentry error reporting activated")
    s.sentryEnabled = true
}
```

Sentry middleware with repanic (bubbles panics to chi's Recoverer):

```go
if s.sentryEnabled {
    sentryHandler := sentryhttp.New(sentryhttp.Options{
        Repanic: true,
    })
    s.router.Use(sentryHandler.Handle)
}
```

Flush Sentry on shutdown:

```go
if s.sentryEnabled {
    sentry.Flush(2 * time.Second)
}
```

## Prometheus Metrics

Metrics are conditionally enabled and protected by basic auth:

```go
// Only enable if credentials are configured
if viper.GetString("METRICS_USERNAME") != "" {
    s.router.Use(s.mw.Metrics())
}

// Protected /metrics endpoint
if viper.GetString("METRICS_USERNAME") != "" {
    s.router.Group(func(r chi.Router) {
        r.Use(s.mw.MetricsAuth())
        r.Get("/metrics", http.HandlerFunc(promhttp.Handler().ServeHTTP))
    })
}
```

## Environment Variables Summary

| Variable           | Description                      | Default |
| ------------------ | -------------------------------- | ------- |
| `PORT`             | HTTP listen port                 | 8080    |
| `DEBUG`            | Enable debug logging             | false   |
| `DBURL`            | Database connection URL          | ""      |
| `SENTRY_DSN`       | Sentry DSN for error reporting   | ""      |
| `MAINTENANCE_MODE` | Enable maintenance mode          | false   |
| `METRICS_USERNAME` | Basic auth username for /metrics | ""      |
| `METRICS_PASSWORD` | Basic auth password for /metrics | ""      |

# Author

[@sjdev](https://sjdev.co) <[sj@sjdev.co(mailto:sj@sjdev.berlin)>

# License

MIT. See [LICENSE](../LICENSE).
