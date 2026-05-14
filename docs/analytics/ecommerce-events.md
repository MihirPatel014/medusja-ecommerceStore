# Ecommerce Event Taxonomy

Use snake_case event names and stable IDs. Keep event properties small, searchable, and privacy-safe.

Canonical backend events should come from Medusa after durable state changes. Frontend events should capture customer intent and funnel behavior.

## Event Priority

| Priority | Event | Owner | Trigger location | Why it matters |
| --- | --- | --- | --- | --- |
| High | `product_viewed` | Frontend | Product detail page render | Measures product interest and merchandising performance |
| High | `add_to_cart` | Frontend, optionally backend later | After `addToCart` succeeds in product actions | Measures purchase intent and product/cart conversion |
| High | `remove_from_cart` | Frontend | After line item deletion succeeds | Identifies cart friction and product drop-off |
| High | `checkout_started` | Frontend | Checkout page loads with valid cart | First committed checkout funnel step |
| High | `shipping_selected` | Frontend/backend | After shipping method selection succeeds | Shows fulfillment preference and shipping friction |
| High | `payment_started` | Frontend | Customer starts payment/place-order action | Measures payment funnel entry |
| High | `payment_success` | Backend | Razorpay verified webhook or provider success | Canonical successful payment signal |
| High | `payment_failed` | Frontend and backend | Client failure for UX, webhook/provider failure for durable record | Measures gateway, validation, and customer friction |
| High | `order_completed` | Backend canonical, frontend confirmation secondary | Backend `order.placed`; frontend confirmation page for page-level attribution | Core revenue conversion event |
| Medium | `user_identified` | Frontend/backend | After login/customer fetch; backend customer lifecycle event | Links anonymous browsing to known customer journeys |
| Medium | `login_completed` | Frontend/backend | Login action success | Tracks account usage and returning-customer behavior |
| Medium | `email_sent` | Backend | Nodemailer provider success or subscriber after notification creation | Confirms operational communication |
| Medium | `email_failed` | Backend | Nodemailer send failure | Detects support and deliverability issues |
| Medium | `webhook_received` | Backend | Razorpay webhook route entry | Verifies gateway delivery and event volume |
| Medium | `webhook_failed` | Backend | Signature validation or processing failure | Detects payment integration risk |
| Medium | `refund_created` | Backend | Refund event/subscriber or admin refund workflow | Tracks revenue reversal and support quality |
| Medium | `order_cancelled` | Backend | Order cancellation subscriber/workflow | Measures cancellation rate and fulfillment issues |

## Standard Properties

Use these fields consistently when available:

| Property | Type | Notes |
| --- | --- | --- |
| `request_id` | string | From `x-request-id`; connects logs and analytics |
| `cart_id` | string | Cart-level funnel correlation |
| `order_id` | string | Order-level source of truth |
| `customer_id` | string | Use Medusa customer ID, not raw email |
| `product_id` | string | Product analytics |
| `variant_id` | string | Variant-level analytics |
| `line_item_id` | string | Cart item operations |
| `payment_provider` | string | Example: `razorpay`, `stripe`, `manual` |
| `currency_code` | string | ISO currency code |
| `value` | number | Numeric amount in Medusa's amount representation |
| `quantity` | number | Item quantity |
| `item_count` | number | Number of order/cart items |
| `country_code` | string | Region/country routing |
| `source` | string | `frontend`, `backend`, `subscriber`, `webhook` |

## Event Details

### `product_viewed`

- Trigger: frontend product page once the product is loaded.
- File: `apps/storefront/src/app/[countryCode]/(main)/products/[handle]/page.tsx` or a small client component inside the product template.
- Properties: `product_id`, `variant_id`, `handle`, `currency_code`, `value`, `country_code`.
- Why: measures product demand and product detail conversion.

### `add_to_cart`

- Trigger: after `addToCart` succeeds.
- File: `apps/storefront/src/modules/products/components/product-actions/index.tsx`.
- Properties: `cart_id`, `product_id`, `variant_id`, `quantity`, `currency_code`, `value`.
- Why: primary purchase-intent signal.

### `remove_from_cart`

- Trigger: after line item deletion succeeds.
- Files: cart item controls and `apps/storefront/src/lib/data/cart.ts`.
- Properties: `cart_id`, `line_item_id`, `product_id`, `variant_id`, `quantity`.
- Why: identifies drop-off and potential price/shipping friction.

### `checkout_started`

- Trigger: checkout page loads with a cart.
- File: `apps/storefront/src/app/[countryCode]/(checkout)/checkout/page.tsx`.
- Properties: `cart_id`, `currency_code`, `value`, `item_count`.
- Why: start of checkout funnel.

### `shipping_selected`

- Trigger: after shipping method is selected successfully.
- File: `apps/storefront/src/modules/checkout/components/shipping/index.tsx`.
- Properties: `cart_id`, `shipping_option_id`, `shipping_method_name`, `value`.
- Why: helps analyze shipping methods and checkout friction.

### `payment_started`

- Trigger: customer clicks place order/payment button.
- File: `apps/storefront/src/modules/checkout/components/payment-button/index.tsx`.
- Properties: `cart_id`, `payment_provider`, `currency_code`, `value`.
- Why: measures entry into payment step before provider result.

### `payment_success`

- Trigger: backend after Razorpay webhook signature verifies and payment/order relation is confirmed.
- Future file: `apps/backend/src/api/store/razorpay/webhook/route.ts` or Razorpay provider service.
- Properties: `order_id`, `cart_id`, `customer_id`, `payment_provider`, `razorpay_order_id`, `razorpay_payment_id`, `currency_code`, `value`, `request_id`.
- Why: canonical payment success signal.

### `payment_failed`

- Trigger: frontend client failure for UX; backend provider/webhook failure for canonical reporting.
- Files: `payment-button/index.tsx`, future Razorpay route/provider.
- Properties: `cart_id`, `order_id`, `payment_provider`, `error_code`, `request_id`.
- Why: detects payment and checkout friction.

### `order_completed`

- Trigger: backend `order.placed` subscriber.
- File: `apps/backend/src/subscribers/order-placed.ts`.
- Properties: `order_id`, `cart_id`, `customer_id`, `currency_code`, `value`, `item_count`, `payment_provider`.
- Why: core revenue conversion event.

### `order_cancelled`

- Trigger: backend order cancellation event or admin cancellation workflow.
- File: future subscriber in `apps/backend/src/subscribers/order-cancelled.ts`.
- Properties: `order_id`, `customer_id`, `reason`, `value`.
- Why: tracks revenue loss and operational quality.

### `email_sent`

- Trigger: backend email provider success or notification workflow.
- File: `apps/backend/src/modules/email/service.ts`.
- Properties: `template`, `provider`, `message_id`, `order_id` when available.
- Why: confirms customer communication.

### `refund_created`

- Trigger: backend refund event/workflow.
- File: future subscriber in `apps/backend/src/subscribers/refund-created.ts`.
- Properties: `order_id`, `refund_id`, `currency_code`, `value`, `reason`.
- Why: tracks post-purchase issues and revenue reversal.

## What Not To Send To PostHog

- Passwords
- Raw auth tokens
- Reset tokens or reset URLs
- Razorpay key secret, webhook secret, or signatures
- Raw payment gateway payloads
- Card data, CVV, UPI identifiers, bank account details
- Full billing/shipping addresses
- Full rendered email HTML
- SMTP credentials
- Database URLs

## Naming Rules

- Use snake_case.
- Use past-tense for completed actions: `order_completed`, `email_sent`.
- Use step-state for funnel actions: `checkout_started`, `payment_started`.
- Keep one canonical backend revenue event.
- Avoid creating separate event names for every provider unless behavior is truly different; use `payment_provider` property instead.

