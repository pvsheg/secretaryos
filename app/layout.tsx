import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SecretaryOS — AI Compliance Copilot for CS Professionals',
  description: 'Generate Companies Act compliant board minutes, AGM notices and ROC filings in under 60 seconds.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
