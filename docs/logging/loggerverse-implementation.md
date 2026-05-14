# Loggerverse Implementation Guide

This guide adds Loggerverse to the Medusa backend while keeping logging centralized, safe, and beginner-friendly.

## 1. Install Package

From the repo root:

```bash
npm install loggerverse -w @dtc/backend
```

Equivalent from `apps/backend`:

```bash
npm install loggerverse
```

## 2. Add Environment Variables

Add to `apps/backend/.env` locally and to Railway/VPS backend environment variables in production:

```bash
LOG_LEVEL=info
LOG_FORMAT=json
LOG_TO_FILE=true
LOG_DIR=./logs
LOG_FILE_MAX_SIZE_MB=10
LOG_FILE_MAX_FILES=30
LOG_COMPRESS_AFTER_DAYS=7

LOG_DASHBOARD_ENABLED=false
LOG_DASHBOARD_PATH=/internal/logs
LOG_DASHBOARD_USER=
LOG_DASHBOARD_PASSWORD=

LOG_EMAIL_ALERTS_ENABLED=false
LOG_ALERT_EMAIL_TO=
```

Recommended production default:

- `LOG_LEVEL=info`
- `LOG_FORMAT=json`
- `LOG_TO_FILE=false` on Railway unless a persistent volume is configured
- `LOG_TO_FILE=true` on VPS with a persistent log directory
- `LOG_DASHBOARD_ENABLED=false` unless protected behind VPN, basic auth, or a private admin network

## 3. Create Loggerverse Instance

Create:

```txt
apps/backend/src/utils/loggerverse.ts
```

Example:

```ts
import { createLogger, FileTransport, LogLevel } from "loggerverse"

const levelMap: Record<string, LogLevel> = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
  fatal: LogLevel.FATAL,
}

const logDir = process.env.LOG_DIR || "./logs"
const logToFile = process.env.LOG_TO_FILE === "true"
const dashboardEnabled = process.env.LOG_DASHBOARD_ENABLED === "true"

export const loggerverse = createLogger({
  level: levelMap[process.env.LOG_LEVEL || "info"] || LogLevel.INFO,
  context: {
    service: "medusa-backend",
    environment: process.env.NODE_ENV || "development",
    runtime: "node",
  },
  sanitization: {
    redactKeys: [
      "password",
      "pass",
      "token",
      "secret",
      "apiKey",
      "authorization",
      "cookie",
      "set-cookie",
      "card",
      "cvv",
      "otp",
      "reset_url",
      "razorpay_signature",
      "razorpay_secret",
      "SMTP_PASS",
      "DATABASE_URL",
    ],
    maskCharacter: "*",
  },
  dashboard: dashboardEnabled
    ? {
        enabled: true,
        path: process.env.LOG_DASHBOARD_PATH || "/internal/logs",
        logFolder: logDir,
        users:
          process.env.LOG_DASHBOARD_USER && process.env.LOG_DASHBOARD_PASSWORD
            ? [
                {
                  username: process.env.LOG_DASHBOARD_USER,
                  password: process.env.LOG_DASHBOARD_PASSWORD,
                  role: "admin",
                },
              ]
            : [],
        sessionTimeout: 30,
        showMetrics: true,
        maxLogs: 1000,
      }
    : { enabled: false },
  transports: [
    ...(logToFile
      ? [
          new FileTransport({
            logFolder: logDir,
            filename: "medusa",
            format: "json",
            datePattern: "YYYY-MM-DD",
            maxFileSize:
              Number(process.env.LOG_FILE_MAX_SIZE_MB || 10) * 1024 * 1024,
            maxFiles: Number(process.env.LOG_FILE_MAX_FILES || 30),
            compressAfterDays: Number(
              process.env.LOG_COMPRESS_AFTER_DAYS || 7
            ),
          }),
        ]
      : []),
  ],
})
```

## 4. Create Medusa Logger Adapter

Create:

```txt
apps/backend/src/utils/medusa-logger.ts
```

Example:

```ts
import type { Logger } from "@medusajs/framework/types"
import { loggerverse } from "./loggerverse"

type Meta = Record<string, unknown>

function normalizeError(error: unknown): Meta {
  if (error instanceof Error) {
    return {
      error_name: error.name,
      error_message: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    }
  }

  return { error }
}

class LoggerverseMedusaLogger implements Logger {
  private level?: string

  panic(data: unknown): void {
    loggerverse.fatal("panic", normalizeError(data))
  }

  shouldLog(level: string): boolean {
    return !this.level || level !== "debug" || this.level === "debug"
  }

  setLogLevel(level: string): void {
    this.level = level
  }

  unsetLogLevel(): void {
    this.level = undefined
  }

  activity(message: string, config?: unknown): string {
    const activityId = crypto.randomUUID()
    loggerverse.info(message, {
      activity_id: activityId,
      activity_config: config,
    })
    return activityId
  }

  progress(activityId: string, message: string): void {
    loggerverse.info(message, { activity_id: activityId })
  }

  failure(activityId: string, message: string): unknown {
    loggerverse.error(message, { activity_id: activityId })
    return null
  }

  success(activityId: string, message: string): Record<string, unknown> {
    loggerverse.info(message, { activity_id: activityId })
    return { activityId, message }
  }

  error(
    messageOrError: string | Error,
    errorOrMeta?: Error | Meta,
    meta?: Meta
  ): void {
    if (messageOrError instanceof Error) {
      loggerverse.error(messageOrError.message, normalizeError(messageOrError))
      return
    }

    if (errorOrMeta instanceof Error) {
      loggerverse.error(messageOrError, {
        ...normalizeError(errorOrMeta),
        ...meta,
      })
      return
    }

    loggerverse.error(messageOrError, errorOrMeta)
  }

  silly(message: string): void {
    loggerverse.debug(message, { level_alias: "silly" })
  }

  debug(message: string): void {
    loggerverse.debug(message)
  }

  verbose(message: string): void {
    loggerverse.debug(message, { level_alias: "verbose" })
  }

  http(message: string): void {
    loggerverse.info(message, { channel: "http" })
  }

  info(message: string, meta?: Meta): void {
    loggerverse.info(message, meta)
  }

  warn(message: string, meta?: Meta): void {
    loggerverse.warn(message, meta)
  }

  log(...args: unknown[]): void {
    loggerverse.info("log", { args })
  }
}

export const logger = new LoggerverseMedusaLogger()
```

If TypeScript reports method signature mismatches, keep the same method names but loosen extra metadata parameters. Medusa's logger interface is the contract.

## 5. Register Logger In Medusa

Update:

```txt
apps/backend/medusa-config.ts
```

Example:

```ts
import { loadEnv, defineConfig } from "@medusajs/framework/utils"
import { logger } from "./src/utils/medusa-logger"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

module.exports = defineConfig({
  logger,
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  modules: [
    // existing modules stay here
  ],
})
```

## 6. Add Request Logging Middleware

Create:

```txt
apps/backend/src/api/middlewares.ts
```

Example:

```ts
import {
  defineMiddlewares,
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

function getRequestId(req: MedusaRequest) {
  return (
    req.headers["x-request-id"]?.toString() ||
    req.headers["x-correlation-id"]?.toString() ||
    crypto.randomUUID()
  )
}

function requestLogger(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const startedAt = Date.now()
  const requestId = getRequestId(req)
  const logger = req.scope.resolve("logger")

  res.setHeader("x-request-id", requestId)

  res.on("finish", () => {
    const statusCode = res.statusCode
    const meta = {
      request_id: requestId,
      method: req.method,
      path: req.path,
      status_code: statusCode,
      duration_ms: Date.now() - startedAt,
      user_agent: req.headers["user-agent"],
    }

    if (statusCode >= 500) {
      logger.error("api_request_failed", meta)
      return
    }

    if (statusCode >= 400) {
      logger.warn("api_request_warning", meta)
      return
    }

    logger.info("api_request_completed", meta)
  })

  next()
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/*",
      middlewares: [requestLogger],
    },
  ],
})
```

Do not log request bodies globally. Log safe, specific fields inside route handlers when needed.

## 7. Structured Logging Examples

### API Error

```ts
try {
  // route logic
} catch (error) {
  const logger = req.scope.resolve("logger")

  logger.error("custom_api_failed", error as Error, {
    request_id: req.headers["x-request-id"],
    route: "/store/custom",
  })

  throw error
}
```

### Razorpay Webhook

Future file:

```txt
apps/backend/src/api/store/razorpay/webhook/route.ts
```

Log only verification outcome and stable IDs:

```ts
logger.info("razorpay_webhook_received", {
  request_id,
  event_type,
  razorpay_event_id,
})

logger.warn("razorpay_webhook_signature_invalid", {
  request_id,
  razorpay_event_id,
})

logger.info("payment_success", {
  request_id,
  order_id,
  payment_provider: "razorpay",
  razorpay_payment_id,
})
```

Do not log the raw webhook payload, webhook secret, signature, full customer address, card data, UPI VPA, phone number, or email address unless explicitly masked.

### Order Creation

```ts
logger.info("order_completed", {
  order_id: order.id,
  display_id: order.display_id,
  customer_id: order.customer_id,
  cart_id: order.cart_id,
  currency_code: order.currency_code,
  value: order.total,
})
```

### Email Logging

```ts
logger.info("email_sent", {
  template,
  channel: "email",
  provider: "nodemailer",
  message_id: info.messageId,
})

logger.error("email_failed", error as Error, {
  template,
  channel: "email",
  provider: "nodemailer",
})
```

Never log reset links, reset tokens, SMTP credentials, or full rendered email HTML.

## 8. Masking Sensitive Data

Always redact:

- Passwords, password reset tokens, auth tokens, JWTs, cookies, API keys
- Razorpay key secret, webhook secret, signatures, card details, UPI identifiers
- SMTP credentials
- Database URLs
- Full request/response bodies from payments and auth routes
- Full shipping/billing addresses

Safe identifiers:

- `request_id`
- `order_id`
- `cart_id`
- `customer_id`
- `product_id`
- `variant_id`
- `payment_provider`
- `currency_code`
- numeric totals

## 9. Log Levels

| Level | Use |
| --- | --- |
| `debug` | Local development and detailed troubleshooting |
| `info` | Successful business and operational events |
| `warn` | Recoverable problems, validation failures, webhook retries, suspicious 4xx responses |
| `error` | Failed operations needing investigation |
| `fatal` | Process-level failures, startup failure, uncaught exception |

Recommended production level: `info`.

## 10. Global Exception Handling

Add this near backend startup code only if it does not conflict with Medusa process management. A safe location is a small utility imported by `medusa-config.ts` after logger initialization.

```ts
import { loggerverse } from "./loggerverse"

let registered = false

export function registerProcessErrorHandlers() {
  if (registered) {
    return
  }

  registered = true

  process.on("uncaughtException", (error) => {
    loggerverse.fatal("uncaught_exception", {
      error_name: error.name,
      error_message: error.message,
      stack: error.stack,
    })
  })

  process.on("unhandledRejection", (reason) => {
    loggerverse.error("unhandled_rejection", {
      reason:
        reason instanceof Error
          ? { error_name: reason.name, error_message: reason.message }
          : reason,
    })
  })
}
```

Do not swallow fatal errors. Log them, let the process manager restart the backend if needed.

## 11. Loggerverse Dashboard

Loggerverse can expose a dashboard middleware for Express. In Medusa, only enable it after confirming the middleware can be mounted safely in the Medusa request stack.

Production rule:

- Keep disabled by default.
- If enabled, restrict with VPN/private network/reverse proxy auth.
- Do not expose log dashboards publicly.
- Prefer external log search for production teams.

## 12. Troubleshooting

| Problem | Likely cause | Fix |
| --- | --- | --- |
| No file logs | `LOG_TO_FILE` disabled or path not writable | Enable file transport and use writable `LOG_DIR` |
| Railway logs disappear | Railway filesystem is ephemeral | Use stdout/stderr and Railway log drains or external logging |
| Duplicate logs | Both middleware and route catch block log same error | Log request once globally and add domain context only where needed |
| Sensitive values appear | Missing redaction key or raw object logged | Add redaction key and replace raw object logs with allowlisted fields |
| Dashboard not reachable | Dashboard disabled or not mounted | Keep disabled in production unless intentionally protected |
| PostHog backend events missing | Analytics provider not configured or no distinct ID | Configure provider and pass stable `actor_id` |
