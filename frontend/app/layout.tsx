import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Nerior Admin",
  description: "Nerior ecosystem administration",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
