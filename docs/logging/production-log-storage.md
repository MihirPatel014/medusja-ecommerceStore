# Production Log Storage

## Where Logs Are Physically Stored

With Loggerverse file transport enabled:

```txt
apps/backend/logs/
  medusa-YYYY-MM-DD.log
  medusa-YYYY-MM-DD-1.log
  medusa-YYYY-MM-DD.gz
```

The exact filenames depend on Loggerverse file transport options such as `filename`, `datePattern`, `maxFileSize`, `maxFiles`, and `compressAfterDays`.

With file transport disabled, logs go to stdout/stderr only. This is often the right default for managed platforms.

## Railway Behavior

Railway containers should be treated as ephemeral.

Recommended Railway setup:

- Send application logs to stdout/stderr.
- Keep `LOG_TO_FILE=false` unless using a persistent volume.
- Use Railway log viewer for short-term debugging.
- Configure a log drain or external logging provider for retention and search.
- Store `POSTHOG_*`, Razorpay secrets, SMTP credentials, and database URLs as Railway service variables.

Why:

- Local container files can disappear across restarts and redeploys.
- File rotation inside an ephemeral filesystem is not a reliable retention strategy.
- Centralized platform logs are easier to search during incidents.

## VPS Behavior

On a VPS, persistent file logs are useful if the log directory is on a persistent disk.

Recommended VPS setup:

```bash
LOG_TO_FILE=true
LOG_DIR=/var/log/medusa-store
LOG_FILE_MAX_SIZE_MB=10
LOG_FILE_MAX_FILES=30
LOG_COMPRESS_AFTER_DAYS=7
```

Create and permission the directory for the app user:

```bash
sudo mkdir -p /var/log/medusa-store
sudo chown medusa:medusa /var/log/medusa-store
sudo chmod 750 /var/log/medusa-store
```

If running through systemd, also keep stdout/stderr in journald:

```ini
[Service]
WorkingDirectory=/srv/my-medusa-store/apps/backend
ExecStart=/usr/bin/npm run start
Restart=always
User=medusa
EnvironmentFile=/etc/medusa-store/backend.env
StandardOutput=journal
StandardError=journal
```

## Log Rotation Strategy

Use Loggerverse rotation for app log files:

- Rotate daily with `datePattern`.
- Rotate by size with `maxFileSize`.
- Keep 14 to 30 days locally.
- Compress old files after 7 days.

On VPS, also configure OS-level safety with `logrotate` if logs are written outside the app folder:

```txt
/var/log/medusa-store/*.log {
  daily
  rotate 30
  compress
  missingok
  notifempty
  copytruncate
  create 0640 medusa medusa
}
```

## Persistent Storage Best Practices

- Use stdout/stderr as the baseline on all platforms.
- Use file logs only when the filesystem is persistent.
- Ship logs to a centralized system for production search and alerts.
- Keep local retention short. Long-term retention belongs in object storage or a logging platform.
- Encrypt backups if logs may contain user identifiers.
- Restrict access to logs because order IDs, customer IDs, emails, and IPs may still be personal data.

## Recommended Production Destinations

| Destination | Use case |
| --- | --- |
| Railway logs | Short-term platform debugging |
| journald | VPS service-level debugging |
| Loggerverse files | Local/VPS historical inspection |
| S3-compatible bucket | Cheap archive of compressed logs |
| Better Stack, Datadog, Grafana Loki, OpenSearch | Search, alerting, dashboards, incident review |
| PostHog | Product analytics, not raw logs |

## Dashboard Access Hardening

If Loggerverse dashboard is enabled:

- Require authentication.
- Put it behind VPN, Cloudflare Access, Tailscale, or basic auth.
- Do not expose it on public storefront domains.
- Use an internal path such as `/internal/logs`.
- Disable in production if your team already uses a centralized logging provider.

## Retention Recommendations

| Data | Retention |
| --- | --- |
| Debug logs | Disabled in production or less than 7 days |
| App info/warn/error logs | 14 to 30 days searchable |
| Security/payment audit logs | 90 to 180 days, access restricted |
| Raw payment/webhook payloads | Do not store in logs |
| Email delivery metadata | 30 to 90 days without full content |

## Incident Search Patterns

Search by:

- `request_id`
- `order_id`
- `cart_id`
- `customer_id`
- `razorpay_payment_id`
- `razorpay_order_id`
- `message_id`
- `event_type`

Do not use email, phone, full name, or address as the primary search key unless your privacy policy and access controls allow it.

