import EmailNotificationProviderService from "./service.js"
import { ModuleProvider, Modules } from "@medusajs/framework/utils"

export default ModuleProvider(Modules.NOTIFICATION, {
  services: [EmailNotificationProviderService],
})
