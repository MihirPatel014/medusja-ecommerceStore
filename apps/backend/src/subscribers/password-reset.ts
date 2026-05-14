import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

export default async function resetPasswordTokenHandler({
  event: { data: {
    entity_id: email,
    token,
    actor_type,
  } },
  container,
}: SubscriberArgs<{ entity_id: string, token: string, actor_type: string }>) {
  console.log(`Subscriber: Received auth.password_reset for ${actor_type} - ${email}`)
  const notificationModuleService = container.resolve(
    Modules.NOTIFICATION
  )
  const configModule = container.resolve("configModule")

  let urlPrefix = ""

  if (actor_type === "customer") {
    // For storefront, use the storefront URL if configured, otherwise default to localhost:8000
    urlPrefix = process.env.STOREFRONT_URL || "http://localhost:8000"
  } else {
    // For admin, use the backend URL + admin path
    const backendUrl = configModule.projectConfig.http.adminCors?.split(',')[0] || "http://localhost:9000"
    urlPrefix = `${backendUrl}/app`
  }

  await notificationModuleService.createNotifications({
    to: email,
    channel: "email",
    template: "password-reset",
    data: {
      reset_url: `${urlPrefix}/reset-password?token=${token}&email=${email}`,
      email,
    },
  })
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
}
