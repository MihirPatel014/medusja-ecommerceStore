"use client"

import { useEffect, useRef } from "react"
import { trackOrderCompleted } from "@lib/analytics/events"
import { HttpTypes } from "@medusajs/types"

export default function OrderAnalytics({ order }: { order: HttpTypes.StoreOrder }) {
  const tracked = useRef(false)

  useEffect(() => {
    if (tracked.current) return

    const orderData = order as any

    trackOrderCompleted({
      order_id: order.id,
      cart_id: orderData.cart_id ?? undefined,
      currency_code: order.currency_code,
      value: order.total,
      shipping_total: orderData.shipping_subtotal ?? 0,
      tax_total: orderData.tax_total ?? 0,
      items: order.items?.map((item: any) => ({
        variant_id: item.variant_id ?? "unknown",
        product_id: item.product_id ?? "unknown",
        name: item.title ?? "unknown",
        unit_price: item.unit_price,
        quantity: item.quantity,
      })) ?? [],
    })

    tracked.current = true
  }, [order])

  return null
}
