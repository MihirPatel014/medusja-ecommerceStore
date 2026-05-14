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
