import ResetPassword from "@modules/account/components/reset-password"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Reset your account password.",
}

type Props = {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ token?: string; email?: string }>
}

export default async function ResetPasswordPage({ params, searchParams }: Props) {
  const { token, email } = await searchParams
  const { countryCode } = await params

  if (!token || !email) {
    return notFound()
  }

  return (
    <div className="w-full flex justify-center px-8 py-12">
      <ResetPassword token={token} email={email} countryCode={countryCode} />
    </div>
  )
}
