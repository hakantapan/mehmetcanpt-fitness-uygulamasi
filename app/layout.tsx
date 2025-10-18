import type { Metadata } from 'next'
import { Saira } from 'next/font/google'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { ThemeProvider } from '../components/theme-provider'
import AuthSessionProvider from '../components/providers/session-provider'
import React from 'react'

// Saira fontunu yükle
const saira = Saira({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-saira',
  weight: ['300', '400', '500', '600', '700'],
  fallback: ['system-ui', 'sans-serif']
})

export const metadata: Metadata = {
  title: 'Mehmetcan PT Online',
  description: 'Kişisel antrenör yönetim platformu',
  generator: 'mehmetcan-pt-online',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr" suppressHydrationWarning className="light">
      <body className={`font-sans ${saira.variable} ${GeistMono.variable}`} suppressHydrationWarning>
        <AuthSessionProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} forcedTheme="light">
            {children}
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  )
}
