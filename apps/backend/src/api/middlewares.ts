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

    const l = logger as any

    if (statusCode >= 500) {
      l.error("api_request_failed", meta)
      return
    }

    if (statusCode >= 400) {
      l.warn("api_request_warning", meta)
      return
    }

    l.info("api_request_completed", meta)
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
