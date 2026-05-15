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
