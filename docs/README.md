# Observability Documentation

This folder is the implementation playbook for adding production-ready observability to this Medusa ecommerce monorepo.

The current project shape used by these docs:

- Backend: Medusa v2.15.1 in `apps/backend`
- Storefront: Next.js 15 App Router in `apps/storefront`
- Database: PostgreSQL
- Email: custom Nodemailer provider with React Email templates in `apps/backend/src/modules/email`
- Current checkout code: Medusa starter Stripe/manual flow
- Planned payment layer: Razorpay
- Planned deployments: Vercel for storefront, Railway or VPS for backend

## Reading Order

1. [Logging structure analysis](./logging/project-structure-analysis.md)
2. [Loggerverse implementation](./logging/loggerverse-implementation.md)
3. [Production log storage](./logging/production-log-storage.md)
4. [PostHog frontend implementation](./analytics/posthog-frontend.md)
5. [PostHog backend implementation](./analytics/posthog-backend.md)
6. [Ecommerce event taxonomy](./analytics/ecommerce-events.md)
7. [Environment variables](./deployment/environment-variables.md)
8. [Production monitoring](./deployment/production-monitoring.md)
9. [Final recommended architecture](./architecture/final-recommended-architecture.md)

## Environment Matrix

| Area | Local development | Vercel storefront | Railway backend | VPS backend |
| --- | --- | --- | --- | --- |
| Storefront env | `apps/storefront/.env.local` | Vercel project variables | N/A | N/A |
| Backend env | `apps/backend/.env` | N/A | Railway service variables | systemd/PM2 env file |
| Backend logs | `apps/backend/logs` if file transport enabled, plus terminal | N/A | stdout/stderr by default | stdout/stderr plus persistent file logs |
| PostHog frontend | `NEXT_PUBLIC_POSTHOG_*` | `NEXT_PUBLIC_POSTHOG_*` | N/A | N/A |
| PostHog backend | `POSTHOG_*` in backend env | N/A | Railway service variables | server env file |
| Razorpay | test keys only | publishable checkout key if needed | secret keys and webhook secret | secret keys and webhook secret |

## Implementation Checklist

- Add Loggerverse to the backend workspace.
- Create one Loggerverse instance and one Medusa logger adapter.
- Register the custom logger through `medusa-config.ts`.
- Add Medusa API middleware for `request_id`, request duration, status code, and safe metadata.
- Replace direct custom backend `console.*` calls over time with `container.resolve("logger")`.
- Add PostHog to the storefront with privacy-safe initialization.
- Add reusable analytics helpers instead of calling `posthog.capture` across components.
- Register Medusa's official PostHog Analytics Module provider for backend analytics.
- Track ecommerce events at the source of truth: frontend for intent, backend for durable business outcomes.
- Keep logs and analytics privacy-safe: no secrets, card data, passwords, raw webhook payloads, reset tokens, or full addresses.

## Source References

- [Loggerverse](https://github.com/jatin2507/loggerverse)
- [Medusa custom logger](https://docs.medusajs.com/learn/debugging-and-testing/logging/custom-logger)
- [Medusa middleware](https://docs.medusajs.com/learn/fundamentals/api-routes/middlewares)
- [Medusa events and subscribers](https://docs.medusajs.com/learn/fundamentals/events-and-subscribers)
- [Medusa PostHog analytics provider](https://docs.medusajs.com/resources/infrastructure-modules/analytics/posthog)
- [PostHog Next.js](https://posthog.com/docs/libraries/next-js)
- [PostHog Node.js](https://posthog.com/docs/libraries/node)
- [PostHog replay privacy](https://posthog.com/docs/session-replay/privacy)

