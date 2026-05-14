# Logging Project Structure Analysis

## Current Backend Shape

The backend is a Medusa v2.15.1 app in `apps/backend`.

Important existing files:

- `apps/backend/medusa-config.ts`: central Medusa config. This is where the custom Loggerverse-backed Medusa logger should be registered.
- `apps/backend/instrumentation.ts`: currently contains commented OpenTelemetry setup. Keep this for tracing later; do not use it as the primary logging initializer.
- `apps/backend/src/modules/email/service.ts`: custom Nodemailer notification provider. It currently logs email operations directly and should move to the Medusa logger.
- `apps/backend/src/subscribers/password-reset.ts`: existing subscriber for `auth.password_reset`. It should resolve `logger` from the Medusa container.
- `apps/backend/src/api/*`: custom API routes. Add request logging middleware in `apps/backend/src/api/middlewares.ts`.
- `apps/backend/src/workflows/*` and `apps/backend/src/subscribers/*`: best locations for durable domain logging and backend analytics.

There is no Razorpay source code in the current repo. Treat Razorpay as planned production integration and reserve logging/analytics hook points for the future Razorpay payment provider and webhook routes.

## Where Logging Should Initialize In Medusa

Use Medusa's logger override point, not ad hoc imports everywhere.

Recommended files:

```txt
apps/backend/src/utils/loggerverse.ts
apps/backend/src/utils/medusa-logger.ts
apps/backend/medusa-config.ts
```

`src/utils/loggerverse.ts` owns the Loggerverse instance, transports, redaction settings, and service context.

`src/utils/medusa-logger.ts` implements Medusa's `Logger` interface and delegates to Loggerverse. This adapter lets Medusa core, custom routes, subscribers, workflows, modules, and scripts share one logging surface.

`medusa-config.ts` imports the adapter instance and passes it to `defineConfig({ logger, ... })`.

## Where Request Logging Belongs

Add:

```txt
apps/backend/src/api/middlewares.ts
```

Medusa loads this file automatically for API middlewares. Use it to:

- Create or propagate `x-request-id`.
- Add `x-request-id` to the response.
- Log method, path, status code, duration, user agent, safe IP metadata, and route family.
- Avoid logging request bodies by default.
- Emit error-level logs for 5xx responses and warn-level logs for important 4xx responses.

Request middleware should produce operational logs. Business logs should still live in subscribers/workflows where order, payment, and email context is available.

## Suitable Hooks, Middleware, And Event Listeners

| Concern | Best Medusa extension point | Why |
| --- | --- | --- |
| All API requests | `src/api/middlewares.ts` | One place for request IDs, duration, status, and route metadata |
| API route errors | Medusa logger override plus route catch blocks where custom logic exists | Avoid duplicate logging while still preserving local context |
| Order completion | `src/subscribers/order-placed.ts` listening to `order.placed` | Durable backend event after Medusa completes the order |
| Payment outcomes | Razorpay provider methods and Razorpay webhook route | Payment truth comes from provider/webhook, not only browser clicks |
| Email delivery | `src/modules/email/service.ts` | The provider knows template, message ID, and delivery failure |
| Password reset | Existing `src/subscribers/password-reset.ts` | Subscriber has actor type and target email, but must not log token |
| Refunds/cancellations | Medusa subscribers for emitted order/payment/refund events | Backend source of truth |
| Background jobs | `src/jobs/*` | Job-level duration and failure logging |

## How To Avoid Coupling Logging Everywhere

Use three layers:

1. Medusa logger adapter: one global logger registered in `medusa-config.ts`.
2. Small domain helpers: optional helpers such as `logOrderEvent`, `logPaymentEvent`, and `logEmailEvent` for consistent fields.
3. Container resolution: custom Medusa code should resolve `logger` from `container` when available.

Do not import Loggerverse directly inside routes, subscribers, workflows, or modules unless you are in the logger adapter itself. This keeps the app replaceable if you later add OpenTelemetry, Datadog, Better Stack, or another sink.

Example pattern in a subscriber:

```ts
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")

  logger.info("order_completed", {
    order_id: data.id,
    source: "subscriber.order_placed",
  })
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
```

## Where Environment Variables Should Live

Backend-only secrets live in `apps/backend/.env` locally and in Railway/VPS backend variables in production.

Storefront browser-readable values live in `apps/storefront/.env.local` locally and Vercel variables in production. Only values prefixed with `NEXT_PUBLIC_` should be exposed to browser code.

Never put backend secrets in `NEXT_PUBLIC_*`.

## Recommended Backend Additions

```txt
apps/backend/src/utils/
  loggerverse.ts
  medusa-logger.ts
  safe-log-fields.ts

apps/backend/src/api/
  middlewares.ts
  store/razorpay/webhook/route.ts       # future planned route

apps/backend/src/subscribers/
  order-placed.ts
  payment-events.ts                     # future planned subscriber if events are available

apps/backend/src/workflows/
  track-order-placed.ts
  track-payment-event.ts
```

## Recommended Storefront Additions For Analytics

```txt
apps/storefront/instrumentation-client.ts

apps/storefront/src/lib/analytics/
  client.ts
  events.ts
  ecommerce.ts

apps/storefront/src/modules/analytics/
  posthog-pageview.tsx                  # optional if manual pageview tracking is needed
  identify-customer.tsx                 # optional client component after login/customer fetch
```

