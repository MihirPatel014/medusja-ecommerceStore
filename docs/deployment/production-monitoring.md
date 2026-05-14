# Production Monitoring

Production monitoring should answer four questions quickly:

1. Is the store available?
2. Can customers check out?
3. Are payments and webhooks working?
4. Can we find the logs and analytics for a specific order?

## Minimum Dashboards

### Backend Operations

Source: Loggerverse logs, Railway logs, journald, or centralized log search.

Track:

- request count by route
- 4xx and 5xx counts
- slow API requests
- webhook failures
- email failures
- process restarts
- database connection errors

### Ecommerce Funnel

Source: PostHog.

Track:

- `product_viewed`
- `add_to_cart`
- `checkout_started`
- `payment_started`
- `payment_success`
- `payment_failed`
- `order_completed`

Recommended funnel:

```txt
product_viewed -> add_to_cart -> checkout_started -> payment_started -> order_completed
```

Add payment diagnostics:

```txt
payment_started -> payment_success
payment_started -> payment_failed
```

### Payment Health

Source: backend logs, PostHog backend events, Razorpay dashboard.

Track:

- webhook received count
- webhook signature failures
- duplicate webhook events
- payment success rate
- payment failure reasons
- time from `payment_started` to `payment_success`

### Email Health

Source: backend logs, SMTP provider dashboard.

Track:

- `email_sent`
- `email_failed`
- template name
- provider message ID
- SMTP error class

## Alerting Strategy

Start with a small set of high-signal alerts:

| Alert | Severity | Example threshold |
| --- | --- | --- |
| Backend unavailable | Critical | health check fails for 2 minutes |
| Storefront unavailable | Critical | Vercel domain check fails for 2 minutes |
| 5xx spike | High | more than 5 percent 5xx over 5 minutes |
| Payment failures spike | High | more than 10 failures in 10 minutes or conversion drops sharply |
| Razorpay webhook failures | High | any sustained signature/processing failure |
| Email failures | Medium | more than 5 failures in 10 minutes |
| Database connection failures | Critical | any repeated connection failure |
| Log volume anomaly | Medium | sudden drop to zero or sudden major spike |

Do not alert on every warning. Warnings should be searchable first, then promoted to alerts only when they represent customer impact.

## Correlation Workflow

When support reports an issue:

1. Get `order_id`, `cart_id`, or customer account ID.
2. Search logs by `order_id`.
3. If no order exists, search by `cart_id`.
4. Use `request_id` to inspect the exact API path and timing.
5. Search PostHog for the same `customer_id`, `cart_id`, or `order_id`.
6. Check Razorpay dashboard using safe gateway IDs such as `razorpay_payment_id`.
7. Check email provider using `message_id` if communication is involved.

## Request ID Policy

Backend middleware should:

- Accept inbound `x-request-id`.
- Generate one if missing.
- Return it in the response.
- Include it in every request log.
- Include it in payment/webhook analytics where available.

Frontend can display request ID in support-friendly error views later, but do not expose internal stack traces.

## GDPR And Privacy Considerations

Logs and analytics may contain personal data even when carefully minimized.

Rules:

- Do not log or track secrets.
- Do not log raw payment payloads.
- Do not log full addresses.
- Do not log reset links or tokens.
- Do not use raw email as the default distinct ID.
- Keep access to production logs limited.
- Define retention periods.
- Honor deletion/export requests according to your privacy policy.
- Use PostHog masking controls before enabling replay at scale.

For PostHog:

- Use Medusa `customer.id` as the stable user ID.
- Mask all inputs in session replay.
- Add `ph-no-capture` to payment and address areas.
- Disable or pause replay on third-party payment screens when needed.

## What Should Not Be Logged

Never log:

- passwords
- JWTs
- cookies
- auth headers
- reset tokens
- reset URLs
- SMTP credentials
- database URLs
- Razorpay key secret
- Razorpay webhook secret
- Razorpay signature values
- raw webhook bodies
- card data
- CVV
- UPI VPA or bank details
- full shipping or billing addresses
- rendered email HTML

## Keeping Logs Searchable

Use consistent field names:

```txt
request_id
order_id
cart_id
customer_id
product_id
variant_id
payment_provider
razorpay_order_id
razorpay_payment_id
message_id
event_type
duration_ms
status_code
```

Use consistent event messages:

```txt
api_request_completed
api_request_warning
api_request_failed
order_completed
payment_success
payment_failed
webhook_received
webhook_failed
email_sent
email_failed
```

Avoid free-form log messages for important business events. Put variable data in structured metadata.

## Runbook: Checkout Failure

1. Search PostHog for `payment_started` without `order_completed`.
2. Filter by `payment_provider`.
3. Search backend logs by `cart_id` or `request_id`.
4. Check for `payment_failed`, `webhook_failed`, or 5xx logs.
5. Check Razorpay dashboard for gateway-side status.
6. If payment succeeded but order did not complete, inspect webhook processing and Medusa order workflow logs.
7. If payment never started, inspect checkout validation, shipping, or client-side errors.

## Runbook: Webhook Failure

1. Search logs for `webhook_failed`.
2. Check `event_type`, `request_id`, and gateway event ID.
3. Confirm `RAZORPAY_WEBHOOK_SECRET` matches Razorpay dashboard.
4. Confirm the webhook route URL is production backend URL, not storefront URL.
5. Confirm raw body handling is compatible with signature verification.
6. Retry from Razorpay dashboard after fixing the issue.

## Runbook: Email Failure

1. Search logs for `email_failed`.
2. Filter by `template`.
3. Check SMTP provider credentials and quota.
4. Check provider dashboard for bounce/rejection.
5. Confirm no reset token or private content was logged.
6. Retry the notification workflow if it is safe to do so.

## Manual Acceptance Checks

Before calling observability production-ready:

- View a product and confirm `product_viewed`.
- Add item to cart and confirm `add_to_cart`.
- Remove item and confirm `remove_from_cart`.
- Start checkout and confirm `checkout_started`.
- Select shipping and confirm `shipping_selected`.
- Start payment and confirm `payment_started`.
- Simulate payment success and confirm backend `payment_success` plus `order_completed`.
- Simulate payment failure and confirm `payment_failed`.
- Simulate Razorpay webhook and confirm `webhook_received` and `webhook_processed`.
- Send password reset email and confirm `email_sent` without reset token or reset URL in logs.
- Confirm `request_id` appears in response headers and backend logs.
- Confirm PostHog replay masks inputs and private checkout/account areas.

