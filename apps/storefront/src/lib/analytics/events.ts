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
  shipping_total?: number
  tax_total?: number
  items?: {
    variant_id: string
    product_id: string
    name: string
    unit_price: number
    quantity: number
  }[]
}) {
  track("order_completed", input)
}
