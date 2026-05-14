"use client"

import { identifyCustomer } from "@lib/analytics/client"
import { HttpTypes } from "@medusajs/types"
import { useEffect } from "react"

export function IdentifyCustomer({
  customer,
}: {
  customer: HttpTypes.StoreCustomer | null
}) {
  useEffect(() => {
    if (!customer?.id) {
      return
    }

    identifyCustomer(customer.id, {
      customer_id: customer.id,
      has_email: Boolean(customer.email),
    })
  }, [customer?.id])

  return null
}
