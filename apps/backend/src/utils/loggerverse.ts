// @ts-ignore
import { createLogger, FileTransport, ConsoleTransport, LogLevel } from "loggerverse"

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
    new ConsoleTransport(),
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
