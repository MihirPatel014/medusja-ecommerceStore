"use client"

import { resetPassword } from "@lib/data/customer"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import { useActionState } from "react"

type Props = {
  token: string
  email: string
  countryCode: string
}

const ResetPassword = ({ token, email, countryCode }: Props) => {
  const [state, formAction] = useActionState(resetPassword, {
    success: false,
    error: null as string | null,
  })

  return (
    <div
      className="max-w-sm w-full flex flex-col items-center"
      data-testid="reset-password-page"
    >
      <h1 className="text-large-semi uppercase mb-6">Reset Password</h1>
      <p className="text-center text-base-regular text-ui-fg-base mb-8">
        Enter your new password below.
      </p>
      <form className="w-full" action={formAction}>
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="countryCode" value={countryCode} />
        <div className="flex flex-col w-full gap-y-2">
          <Input
            label="New Password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            data-testid="new-password-input"
          />
        </div>
        <ErrorMessage error={state.error} data-testid="reset-password-error" />
        <SubmitButton data-testid="reset-password-button" className="w-full mt-6">
          Reset Password
        </SubmitButton>
      </form>
    </div>
  )
}

export default ResetPassword
