# PostHog Backend Implementation

Backend analytics should track durable ecommerce outcomes from Medusa:

- Order placed/completed
- Payment success/failure
- Razorpay webhook received/verified/failed
- Email sent/failed
- Refund created
- Order cancelled
- Customer properties updated

This backend is Medusa v2.15.1, which supports the official Medusa Analytics Module and PostHog provider.

## 1. Preferred Approach

Use Medusa's official Analytics Module:

- `@medusajs/medusa/analytics`
- `@medusajs/analytics-posthog`

Why:

- It fits Medusa's module architecture.
- It exposes a backend service through the Medusa container.
- It supports shutdown hooks.
- It avoids direct PostHog SDK coupling throughout custom code.

The package already exists in the backend dependency tree, but make it explicit in `apps/backend/package.json`:

```bash
npm install @medusajs/analytics-posthog posthog-node -w @dtc/backend
```

## 2. Add Backend Environment Variables

Local:

```txt
apps/backend/.env
```

Railway/VPS:

- Backend service variables only.

```bash
POSTHOG_EVENTS_API_KEY=ph_project_token
POSTHOG_HOST=https://us.i.posthog.com
POSTHOG_BACKEND_ENABLED=true
```

Do not use `NEXT_PUBLIC_POSTHOG_TOKEN` in backend code unless you intentionally share one project token. Keep backend env names separate to avoid accidentally exposing secrets later.

## 3. Register Medusa Analytics Module

Update:

```txt
apps/backend/medusa-config.ts
```

Example:

```ts
module.exports = defineConfig({
  // existing config
  modules: [
    {
      resolve: "@medusajs/medusa/analytics",
      options: {
        providers: [
          {
            resolve: "@medusajs/analytics-posthog",
            id: "posthog",
            options: {
              posthogEventsKey: process.env.POSTHOG_EVENTS_API_KEY,
              posthogHost:
                process.env.POSTHOG_HOST || "https://us.i.posthog.com",
            },
          },
        ],
      },
    },
    // existing notification module stays here
  ],
})
```

If `POSTHOG_BACKEND_ENABLED` is false in local development, use the local analytics provider instead:

```ts
const analyticsProvider =
  process.env.POSTHOG_BACKEND_ENABLED === "true"
    ? {
        resolve: "@medusajs/analytics-posthog",
        id: "posthog",
        options: {
          posthogEventsKey: process.env.POSTHOG_EVENTS_API_KEY,
          posthogHost: process.env.POSTHOG_HOST,
        },
      }
    : {
        resolve: "@medusajs/medusa/analytics-local",
        id: "local",
      }
```

Medusa supports one analytics provider at a time.

## 4. Create Shared Event Names

Create:

```txt
apps/backend/src/utils/analytics-events.ts
```

Example:

```ts
export const AnalyticsEvents = {
  OrderCompleted: "order_completed",
  OrderCancelled: "order_cancelled",
  PaymentStarted: "payment_started",
  PaymentSuccess: "payment_success",
  PaymentFailed: "payment_failed",
  WebhookReceived: "webhook_received",
  WebhookFailed: "webhook_failed",
  EmailSent: "email_sent",
  EmailFailed: "email_failed",
  RefundCreated: "refund_created",
} as const
```

## 5. Track Order Completed

Create:

```txt
apps/backend/src/workflows/track-order-placed.ts
```

Example:

```ts
import { createStep, createWorkflow } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import type { OrderDTO } from "@medusajs/framework/types"
import { AnalyticsEvents } from "../utils/analytics-events"

const trackOrderPlacedStep = createStep(
  "track-order-placed-step",
  async ({ order }: { order: OrderDTO }, { container }) => {
    const analytics = container.resolve(Modules.ANALYTICS)
    const logger = container.resolve("logger")

    await analytics.track({
      event: AnalyticsEvents.OrderCompleted,
      actor_id: order.customer_id || order.email || order.id,
      properties: {
        order_id: order.id,
        customer_id: order.customer_id,
        cart_id: order.cart_id,
        currency_code: order.currency_code,
        value: order.total,
        item_count: order.items?.length || 0,
        payment_status: order.payment_status,
        fulfillment_status: order.fulfillment_status,
      },
    })

    logger.info("order_completed_tracked", {
      order_id: order.id,
      customer_id: order.customer_id,
    })
  }
)

export const trackOrderPlacedWorkflow = createWorkflow(
  "track-order-placed-workflow",
  ({ order_id }: { order_id: string }) => {
    const { data: orders } = useQueryGraphStep({
      entity: "order",
      fields: ["*", "items.*"],
      filters: { id: order_id },
    })

    trackOrderPlacedStep({
      order: orders[0],
    } as unknown as { order: OrderDTO })
  }
)
```

Create:

```txt
apps/backend/src/subscribers/order-placed.ts
```

Example:

```ts
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { trackOrderPlacedWorkflow } from "../workflows/track-order-placed"

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")

  logger.info("order_placed_event_received", {
    order_id: data.id,
    source: "subscriber.order_placed",
  })

  await trackOrderPlacedWorkflow(container).run({
    input: {
      order_id: data.id,
    },
  })
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
```

## 6. Track Payment Events

Payment outcomes should be tracked where the backend has reliable proof.

For Razorpay, that will usually be:

- payment provider service methods
- webhook route after signature verification
- Medusa payment/order subscribers if events are emitted

Future route:

```txt
apps/backend/src/api/store/razorpay/webhook/route.ts
```

Example after signature verification:

```ts
const analytics = req.scope.resolve(Modules.ANALYTICS)
const logger = req.scope.resolve("logger")

await analytics.track({
  event: "payment_success",
  actor_id: customerId || orderId,
  properties: {
    order_id: orderId,
    cart_id: cartId,
    payment_provider: "razorpay",
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
    currency_code,
    value,
    request_id: requestId,
  },
})

logger.info("payment_success_tracked", {
  order_id: orderId,
  payment_provider: "razorpay",
  request_id: requestId,
})
```

For failures:

```ts
await analytics.track({
  event: "payment_failed",
  actor_id: customerId || cartId || "anonymous",
  properties: {
    cart_id: cartId,
    order_id: orderId,
    payment_provider: "razorpay",
    error_code: safeErrorCode,
    request_id: requestId,
  },
})
```

Do not send raw gateway responses to PostHog.

## 7. Track Webhook Analytics

Track webhook lifecycle events:

- `webhook_received`: request reached backend
- `webhook_verified`: signature valid
- `webhook_failed`: invalid signature or processing failure
- `webhook_processed`: state update completed

Properties:

```ts
{
  webhook_provider: "razorpay",
  event_type,
  request_id,
  order_id,
  payment_provider: "razorpay"
}
```

Avoid:

- raw payload
- signature
- webhook secret
- full customer object
- card/UPI/payment instrument details

## 8. Track Email Events

In:

```txt
apps/backend/src/modules/email/service.ts
```

After mail send succeeds:

```ts
const analytics = this.container?.resolve?.(Modules.ANALYTICS)

await analytics?.track({
  event: "email_sent",
  actor_id: notification.to,
  properties: {
    template,
    provider: "nodemailer",
    message_id: info.messageId,
  },
})
```

If the current provider constructor does not expose the full container, keep analytics tracking in the subscriber/workflow that requests the email, and use logger-only metadata in the provider.

Do not track reset URLs, reset tokens, or rendered email HTML.

## 9. Identify Users And Update Properties

Use `analytics.identify` when a customer is created, logs in, or completes an order.

Example:

```ts
await analytics.identify({
  actor_id: customer.id,
  properties: {
    customer_id: customer.id,
    first_order_completed_at: new Date().toISOString(),
    last_order_id: order.id,
    lifetime_order_count,
  },
})
```

Do not use raw email as the primary `actor_id`. Use Medusa `customer.id` when available.

## 10. Direct PostHog Node SDK Option

Use direct `posthog-node` only for code that cannot reasonably use Medusa's Analytics Module, such as standalone scripts.

Install:

```bash
npm install posthog-node -w @dtc/backend
```

Example:

```ts
import { PostHog } from "posthog-node"

export function createPostHogClient() {
  return new PostHog(process.env.POSTHOG_EVENTS_API_KEY!, {
    host: process.env.POSTHOG_HOST || "https://us.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  })
}
```

For short-lived scripts or serverless-like handlers, call:

```ts
await posthog.shutdown()
```

For long-running Medusa server code, prefer the Analytics Module so shutdown is managed by the module lifecycle.

## 11. Retry And Failure Behavior

Analytics must not block checkout.

Recommendations:

- Log analytics failures at `warn`, not `fatal`.
- Do not fail order placement if PostHog is unavailable.
- Keep event payloads small.
- Use stable IDs so failed events can be reconstructed from order/payment records if needed.
- For critical backend analytics, emit from subscribers/workflows after durable DB changes.

## 12. Troubleshooting

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Backend event missing | Analytics module not registered | Check `medusa-config.ts` modules |
| Provider fails at startup | Missing `POSTHOG_EVENTS_API_KEY` | Add backend env var |
| Events orphaned from frontend sessions | Backend `actor_id` differs from frontend identify ID | Use Medusa `customer.id` on both sides |
| Checkout slowed by analytics | Awaiting too much in critical path | Track in subscribers/workflows after durable actions |
| Duplicate order events | Frontend and backend both treated as canonical | Use backend as canonical and mark frontend as confirmation-page view if needed |

