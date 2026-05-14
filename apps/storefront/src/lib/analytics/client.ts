"use client"

import posthog from "posthog-js"

export type AnalyticsProperties = Record<string, any>

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
