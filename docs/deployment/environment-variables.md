# Environment Variables

This project has two independent runtime surfaces:

- Backend: `apps/backend`
- Storefront: `apps/storefront`

Keep backend secrets out of storefront variables.

## Backend Local Variables

Local file:

```txt
apps/backend/.env
```

Recommended observability variables:

```bash
NODE_ENV=development

DATABASE_URL=postgres://user:password@localhost:5432/medusa
STORE_CORS=http://localhost:8000
ADMIN_CORS=http://localhost:9000
AUTH_CORS=http://localhost:9000,http://localhost:8000
JWT_SECRET=change-me
COOKIE_SECRET=change-me

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

LOG_LEVEL=debug
LOG_FORMAT=json
LOG_TO_FILE=true
LOG_DIR=./logs
LOG_FILE_MAX_SIZE_MB=10
LOG_FILE_MAX_FILES=14
LOG_COMPRESS_AFTER_DAYS=7
LOG_DASHBOARD_ENABLED=false

POSTHOG_BACKEND_ENABLED=false
POSTHOG_EVENTS_API_KEY=
POSTHOG_HOST=https://us.i.posthog.com

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

## Backend Production Variables

Set in Railway service variables or VPS env file.

```bash
NODE_ENV=production

DATABASE_URL=
STORE_CORS=https://your-storefront.com
ADMIN_CORS=https://your-backend.com
AUTH_CORS=https://your-backend.com,https://your-storefront.com
JWT_SECRET=
COOKIE_SECRET=

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

LOG_LEVEL=info
LOG_FORMAT=json
LOG_TO_FILE=false
LOG_DIR=./logs
LOG_FILE_MAX_SIZE_MB=10
LOG_FILE_MAX_FILES=30
LOG_COMPRESS_AFTER_DAYS=7
LOG_DASHBOARD_ENABLED=false

POSTHOG_BACKEND_ENABLED=true
POSTHOG_EVENTS_API_KEY=
POSTHOG_HOST=https://us.i.posthog.com

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

For VPS with persistent logs, set:

```bash
LOG_TO_FILE=true
LOG_DIR=/var/log/medusa-store
```

## Storefront Local Variables

Local file:

```txt
apps/storefront/.env.local
```

```bash
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=
NEXT_PUBLIC_DEFAULT_REGION=dk
NEXT_PUBLIC_BASE_URL=http://localhost:8000

NEXT_PUBLIC_POSTHOG_ENABLED=false
NEXT_PUBLIC_POSTHOG_TOKEN=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_POSTHOG_SESSION_REPLAY=false

NEXT_PUBLIC_RAZORPAY_KEY_ID=
```

Storefront variables are visible to browser users. Only publishable keys belong here.

## Vercel Variables

Set on the Vercel project:

```bash
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://your-backend.com
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_live_or_prod_publishable_key
NEXT_PUBLIC_DEFAULT_REGION=dk
NEXT_PUBLIC_BASE_URL=https://your-storefront.com

NEXT_PUBLIC_POSTHOG_ENABLED=true
NEXT_PUBLIC_POSTHOG_TOKEN=ph_project_token
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_POSTHOG_SESSION_REPLAY=true

NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_public_key_id
```

Never set these in Vercel:

- `DATABASE_URL` for backend database unless Vercel server code truly needs it
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `SMTP_PASS`
- `JWT_SECRET`
- `COOKIE_SECRET`
- `POSTHOG_EVENTS_API_KEY` if you intend it to be backend-only

## Railway Variables

Set on the backend Railway service:

```bash
DATABASE_URL=
STORE_CORS=https://your-storefront.com
ADMIN_CORS=https://your-backend.up.railway.app
AUTH_CORS=https://your-backend.up.railway.app,https://your-storefront.com
JWT_SECRET=
COOKIE_SECRET=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
LOG_LEVEL=info
LOG_TO_FILE=false
POSTHOG_BACKEND_ENABLED=true
POSTHOG_EVENTS_API_KEY=
POSTHOG_HOST=https://us.i.posthog.com
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

Railway logs should be stdout/stderr first. Add a log drain for persistent search.

## VPS Variables

Recommended file:

```txt
/etc/medusa-store/backend.env
```

Use the same production backend variables as Railway, with:

```bash
LOG_TO_FILE=true
LOG_DIR=/var/log/medusa-store
```

Protect the file:

```bash
sudo chown root:medusa /etc/medusa-store/backend.env
sudo chmod 640 /etc/medusa-store/backend.env
```

## Secret Naming Rules

- Use `NEXT_PUBLIC_` only for browser-safe values.
- Use provider-specific names for payment secrets: `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.
- Keep backend PostHog env separate from frontend env: `POSTHOG_EVENTS_API_KEY` vs `NEXT_PUBLIC_POSTHOG_TOKEN`.
- Avoid generic names like `SECRET` or `TOKEN` when a specific name is clearer.
- Rotate secrets if they are ever committed or logged.

## Never Commit

Never commit:

- `.env`
- `.env.local`
- production env files
- secret screenshots
- Railway/Vercel variable exports
- database connection strings
- payment gateway secrets
- SMTP credentials
- log files containing production identifiers

## Validation Checklist

- Backend starts with required Medusa vars.
- Storefront starts with `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`.
- Vercel has only browser-safe values.
- Railway/VPS has all backend secrets.
- PostHog frontend and backend use the same project when you want unified journeys.
- Session replay is enabled only after masking has been reviewed.

