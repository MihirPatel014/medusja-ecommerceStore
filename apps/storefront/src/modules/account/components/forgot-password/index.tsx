"use client"

import { forgotPassword } from "@lib/data/customer"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import { useActionState, useState } from "react"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const ForgotPassword = ({ setCurrentView }: Props) => {
  const [state, formAction] = useActionState(forgotPassword, {
    success: false,
    error: null as string | null,
  })

  return (
    <div
      className="max-w-sm w-full flex flex-col items-center"
      data-testid="forgot-password-page"
    >
      <h1 className="text-large-semi uppercase mb-6">Forgot Password</h1>
      {state.success ? (
        <div className="text-center">
          <p className="text-base-regular text-ui-fg-base mb-8">
            If an account exists with that email, you will receive a password reset link shortly.
          </p>
          <button
            onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
            className="underline"
          >
            Back to sign in
          </button>
        </div>
      ) : (
        <>
          <p className="text-center text-base-regular text-ui-fg-base mb-8">
            Enter your email address and we'll send you a link to reset your password.
          </p>
          <form className="w-full" action={formAction}>
            <div className="flex flex-col w-full gap-y-2">
              <Input
                label="Email"
                name="email"
                type="email"
                title="Enter a valid email address."
                autoComplete="email"
                required
                data-testid="email-input"
              />
            </div>
            <ErrorMessage error={state.error} data-testid="forgot-password-error" />
            <SubmitButton data-testid="send-reset-link-button" className="w-full mt-6">
              Send reset link
            </SubmitButton>
          </form>
          <span className="text-center text-ui-fg-base text-small-regular mt-6">
            Remember your password?{" "}
            <button
              onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
              className="underline"
            >
              Sign in
            </button>
            .
          </span>
        </>
      )}
    </div>
  )
}

export default ForgotPassword
