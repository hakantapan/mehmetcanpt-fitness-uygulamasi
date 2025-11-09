"use client"

import React from "react"
import { useSession } from "next-auth/react"
import { MobileAppLayout } from "@/components/mobile-app-layout"
import AdminLayout from "@/components/admin-layout"
import { TrainerLayout } from "@/components/trainer-layout"
import { FitnessLayout } from "@/components/fitness-layout"
import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/toaster"

interface ResponsiveLayoutProps {
  children: React.ReactNode
}

export function ResponsiveLayout({ children }: ResponsiveLayoutProps) {
  const { data: session } = useSession()
  const userRole = session?.user?.role

  return (
    <>
      {/* Mobile Layout - sadece mobilde görünür - Force Light Theme */}
      <div className="block lg:hidden">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} forcedTheme="light">
          <MobileAppLayout>{children}</MobileAppLayout>
        </ThemeProvider>
      </div>
      
      {/* Desktop Layout - sadece desktop'ta görünür - System Theme */}
      <div className="hidden lg:block">
        {userRole === 'ADMIN' && <AdminLayout>{children}</AdminLayout>}
        {userRole === 'TRAINER' && <TrainerLayout>{children}</TrainerLayout>}
        {userRole === 'CLIENT' && <FitnessLayout>{children}</FitnessLayout>}
        {!userRole && <FitnessLayout>{children}</FitnessLayout>}
      </div>
      <Toaster />
    </>
  )
}

export default ResponsiveLayout