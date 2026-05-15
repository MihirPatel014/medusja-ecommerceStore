import { AbstractNotificationProviderService } from "@medusajs/framework/utils"
import {
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO
} from "@medusajs/framework/types"
import nodemailer from "nodemailer"
import { render } from "@react-email/render"
import { PasswordResetEmail } from "./templates/password-reset"
import React from "react"

interface EmailNotificationConfig {
  host: string
  port: number
  user: string
  pass: string
  from: string
}

class EmailNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "email-notification"
  protected transporter: nodemailer.Transporter
  protected config: EmailNotificationConfig
  protected logger: any

  constructor({ logger }: { logger: any }, options: EmailNotificationConfig) {
    super()
    this.config = options
    this.logger = logger
    this.transporter = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: options.port === 465,
      auth: {
        user: options.user,
        pass: options.pass,
      },
    })
  }

  async send(
    notification: ProviderSendNotificationDTO
  ): Promise<ProviderSendNotificationResultsDTO> {
    this.logger.info("email_notification_sending", {
      to: notification.to,
      template: notification.template
    })

    if (!notification) {
      throw new Error("No notification provided")
    }

    const { to, template, data } = notification

    let html: string
    let subject: string

    switch (template) {
      case "password-reset":
        subject = "Reset Your Password"
        try {
          // Try rendering with react-email
          html = await render(
            React.createElement(PasswordResetEmail, {
              reset_url: (data as any)?.reset_url,
              email: (data as any)?.email,
            })
          )
        } catch (renderError) {
          this.logger.warn("email_react_render_failed", {
            error: renderError instanceof Error ? renderError.message : renderError,
            template
          })
          // Fallback to simple HTML if React render fails due to version conflicts
          const reset_url = (data as any)?.reset_url
          html = `
            <div style="font-family: sans-serif; padding: 20px;">
              <h2>Reset Your Password</h2>
              <p>Hello,</p>
              <p>We received a request to reset your password. Click the link below to set a new password:</p>
              <p><a href="${reset_url}" style="background: black; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
              <p>If the button doesn't work, copy and paste this link: ${reset_url}</p>
            </div>
          `
        }
        break
      default:
        throw new Error(`Template ${template} not supported`)
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.config.from,
        to,
        subject,
        html,
      })
      this.logger.info("email_sent_successfully", {
        message_id: info.messageId,
        template
      })
      return { id: info.messageId }
    } catch (error) {
      this.logger.error("email_send_failed", error as Error, {
        template,
        to
      })
      throw error
    }
  }
}

export default EmailNotificationProviderService
