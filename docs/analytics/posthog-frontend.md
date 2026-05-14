# PostHog Frontend Implementation

This guide adds PostHog to the Next.js 15 App Router storefront in `apps/storefront`.

Frontend analytics should track customer intent and behavior:

- Page views
- Product views
- Cart actions
- Checkout step progression
- Payment button interactions
- Login/register identification
- Session replay with privacy-safe masking

Durable business outcomes such as paid order completion should also be tracked from the backend.

## 1. Install Package

From the repo root:

```bash
npm install posthog-js -w @dtc/storefront
```

Equivalent from `apps/storefront`:

```bash
npm install posthog-js
```

## 2. Add Storefront Environment Variables

Local file:

```txt
apps/storefront/.env.local
```

Vercel:

- Add these to the Vercel project environment variables.
- Redeploy after changing them.

```bash
NEXT_PUBLIC_POSTHOG_TOKEN=ph_project_token
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_POSTHOG_ENABLED=true
NEXT_PUBLIC_POSTHOG_SESSION_REPLAY=true
```

Only `NEXT_PUBLIC_*` values are exposed to the browser. Never put backend secrets, Razorpay key secret, webhook secret, SMTP credentials, or database URLs in storefront variables.

## 3. Initialize PostHog In Next.js App Router

Create:

```txt
apps/storefront/instrumentation-client.ts
```

Example:

```ts
import posthog from "posthog-js"

const token = process.env.NEXT_PUBLIC_POSTHOG_TOKEN
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com"
const enabled = process.env.NEXT_PUBLIC_POSTHOG_ENABLED === "true"
const replayEnabled =
  process.env.NEXT_PUBLIC_POSTHOG_SESSION_REPLAY === "true"

if (typeof window !== "undefined" && token && enabled) {
  posthog.init(token, {
    api_host: host,
    defaults: "2026-01-30",
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: false,
    disable_session_recording: !replayEnabled,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector:
        "[data-private], .ph-private, [data-testid='order-email']",
      maskCapturedNetworkRequestFn: (request) => {
        if (request.name) {
          request.name = request.name.replace(
            /([?&](token|auth|email|reset_token)=)[^&]+/g,
            "$1[REDACTED]"
          )
        }

        return request
      },
    },
    loaded: (client) => {
      if (process.env.NODE_ENV === "development") {
        client.debug(false)
      }
    },
  })
}
```

Notes:

- `autocapture: false` keeps ecommerce tracking intentional and easier to audit.
- `capture_pageview: true` is enough for a basic App Router setup.
- If you need more control over route changes, add the manual pageview component below.

## 4. Optional Manual Pageview Component

Create:

```txt
apps/storefront/src/modules/analytics/posthog-pageview.tsx
```

Example:

```tsx
"use client"

import posthog from "posthog-js"
import { usePathname, useSearchParams } from "next/navigation"
import { useEffect } from "react"

export function PostHogPageview() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!pathname) {
      return
    }

    const query = searchParams.toString()
    const currentUrl = query ? `${pathname}?${query}` : pathname

    posthog.capture("$pageview", {
      $current_url: currentUrl,
    })
  }, [pathname, searchParams])

  return null
}
```

If using this component, set `capture_pageview: false` in `instrumentation-client.ts` to prevent duplicates.

Mount in:

```txt
apps/storefront/src/app/layout.tsx
```

```tsx
import { PostHogPageview } from "@modules/analytics/posthog-pageview"

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="light">
      <body>
        <PostHogPageview />
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
```

## 5. Add Analytics Client Helper

Create:

```txt
apps/storefront/src/lib/analytics/client.ts
```

Example:

```ts
"use client"

import posthog from "posthog-js"

export type AnalyticsProperties = Record<
  string,
  string | number | boolean | null | undefined | string[] | number[]
>

export function track(event: string, properties?: AnalyticsProperties) {
  if (typeof window === "undefined") {
    return
  }

  if (process.env.NEXT_PUBLIC_POSTHOG_ENABLED !== "true") {
    return
  }

  posthog.capture(event, cleanProperties(properties))
}

export function identifyCustomer(
  customerId: string,
  properties?: AnalyticsProperties
) {
  if (!customerId || typeof window === "undefined") {
    return
  }

  posthog.identify(customerId, cleanProperties(properties))
}

export function resetAnalyticsIdentity() {
  if (typeof window === "undefined") {
    return
  }

  posthog.reset()
}

function cleanProperties(properties?: AnalyticsProperties) {
  if (!properties) {
    return undefined
  }

  return Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined)
  )
}
```

## 6. Add Ecommerce Event Helpers

Create:

```txt
apps/storefront/src/lib/analytics/events.ts
```

Example:

```ts
"use client"

import { track } from "./client"

export function trackProductViewed(input: {
  product_id: string
  variant_id?: string
  handle?: string
  title?: string
  currency_code?: string
  value?: number
}) {
  track("product_viewed", input)
}

export function trackAddToCart(input: {
  cart_id?: string
  product_id: string
  variant_id: string
  quantity: number
  currency_code?: string
  value?: number
}) {
  track("add_to_cart", input)
}

export function trackRemoveFromCart(input: {
  cart_id?: string
  line_item_id: string
  product_id?: string
  variant_id?: string
  quantity?: number
}) {
  track("remove_from_cart", input)
}

export function trackCheckoutStarted(input: {
  cart_id: string
  currency_code?: string
  value?: number
  item_count?: number
}) {
  track("checkout_started", input)
}

export function trackShippingSelected(input: {
  cart_id: string
  shipping_option_id?: string
  shipping_method_name?: string
}) {
  track("shipping_selected", input)
}

export function trackPaymentStarted(input: {
  cart_id: string
  payment_provider: string
  currency_code?: string
  value?: number
}) {
  track("payment_started", input)
}

export function trackPaymentFailed(input: {
  cart_id?: string
  payment_provider: string
  error_code?: string
  error_message?: string
}) {
  track("payment_failed", input)
}

export function trackOrderCompleted(input: {
  order_id: string
  cart_id?: string
  customer_id?: string
  currency_code?: string
  value?: number
}) {
  track("order_completed", input)
}
```

## 7. Where To Trigger Events In This Storefront

| Event | Current file | Trigger |
| --- | --- | --- |
| `product_viewed` | `apps/storefront/src/app/[countryCode]/(main)/products/[handle]/page.tsx` or a small client component in product template | When product detail page renders |
| `add_to_cart` | `apps/storefront/src/modules/products/components/product-actions/index.tsx` | After `addToCart` succeeds |
| `remove_from_cart` | `apps/storefront/src/lib/data/cart.ts` and cart item client controls | After line item deletion succeeds |
| `checkout_started` | `apps/storefront/src/app/[countryCode]/(checkout)/checkout/page.tsx` | When checkout page loads with a cart |
| `shipping_selected` | `apps/storefront/src/modules/checkout/components/shipping/index.tsx` | After shipping method succeeds |
| `payment_started` | `apps/storefront/src/modules/checkout/components/payment-button/index.tsx` | When customer presses place order/payment button |
| `payment_failed` | `apps/storefront/src/modules/checkout/components/payment-button/index.tsx` | When client-side payment confirmation fails |
| `order_completed` | `apps/storefront/src/app/[countryCode]/(main)/order/[id]/confirmed/page.tsx` | When confirmation page loads, as frontend confirmation only |

Backend should still track the canonical `order_completed` event from `order.placed`.

## 8. User Identification

Use the Medusa customer ID as the PostHog distinct ID after login or account fetch.

Create:

```txt
apps/storefront/src/modules/analytics/identify-customer.tsx
```

Example:

```tsx
"use client"

import { identifyCustomer } from "@lib/analytics/client"
import { HttpTypes } from "@medusajs/types"
import { useEffect } from "react"

export function IdentifyCustomer({
  customer,
}: {
  customer: HttpTypes.StoreCustomer | null
}) {
  useEffect(() => {
    if (!customer?.id) {
      return
    }

    identifyCustomer(customer.id, {
      customer_id: customer.id,
      has_email: Boolean(customer.email),
    })
  }, [customer?.id])

  return null
}
```

Do not send raw email as the primary distinct ID. If email is needed for lifecycle analysis, send a hashed email or a boolean/property approved by your privacy policy.

## 9. Session Replay Privacy

Recommended ecommerce defaults:

- Mask all inputs.
- Mask customer email display areas.
- Add `className="ph-no-capture"` or `data-private` to payment, address, account, and order-detail areas that may contain personal data.
- Stop session recording around third-party payment if masking cannot be guaranteed.
- Redact URL query parameters such as reset tokens and email values.

Examples:

```tsx
<section data-private>
  <ShippingAddressForm />
</section>
```

```tsx
<div className="ph-no-capture">
  <PaymentElementOrRazorpayEmbeddedForm />
</div>
```

## 10. Troubleshooting

| Problem | Likely cause | Fix |
| --- | --- | --- |
| No events in PostHog | Token/host missing or `NEXT_PUBLIC_POSTHOG_ENABLED` false | Check Vercel/local env and redeploy |
| Duplicate pageviews | Both automatic and manual pageview tracking enabled | Use only one pageview strategy |
| Session replay exposes private text | Missing mask selector or unsafe custom component | Add `ph-no-capture`, `data-private`, and stronger replay config |
| Backend and frontend events do not join | Different distinct IDs | Identify frontend with `customer.id`; backend uses same `actor_id` |
| Events blocked by ad blockers | Direct PostHog endpoint blocked | Add a reverse proxy later through Vercel rewrites or managed PostHog proxy |

