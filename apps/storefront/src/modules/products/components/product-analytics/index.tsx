"use client"

import { trackProductViewed } from "@lib/analytics/events"
import { HttpTypes } from "@medusajs/types"
import { useEffect } from "react"

export default function ProductAnalytics({
  product,
  variant,
}: {
  product: HttpTypes.StoreProduct
  variant?: HttpTypes.StoreProductVariant
}) {
  useEffect(() => {
    if (!product.id) {
      return
    }

    trackProductViewed({
      product_id: product.id,
      variant_id: variant?.id,
      handle: product.handle,
      title: product.title,
      // value and currency can be added if available in the context
    })
  }, [product.id, variant?.id])

  return null
}
