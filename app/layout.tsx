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
  title: 'Mehmetcanpt Uzaktan Eğitim',
  description: 'Kişisel antrenör yönetim platformu',
  generator: 'mehmetcan-pt-online',
  manifest: '/manifest.json',
  themeColor: '#000000',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Mehmetcanpt',
  },
  icons: {
    icon: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-256x256.png', sizes: '256x256', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
  },
}

export const dynamic = 'force-dynamic'

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
