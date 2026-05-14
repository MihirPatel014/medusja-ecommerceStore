import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import "styles/globals.css"
import { PostHogPageview } from "@modules/analytics/posthog-pageview"
import "../../instrumentation-client"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="light">
      <body>
        <PostHogPageview />
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
