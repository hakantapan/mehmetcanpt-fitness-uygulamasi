"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  UtensilsCrossed,
  Pill,
  MessageSquare,
  Package,
  Menu,
  X,
  Bell,
  Settings,
  LogOut,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

const menuItems = [
  { href: "/egitmen", icon: LayoutDashboard, label: "Genel Bakış" },
  { href: "/egitmen/danisanlar", icon: Users, label: "Danışanlar" },
  { href: "/egitmen/antrenman", icon: Dumbbell, label: "Antrenman Programı" },
  { href: "/egitmen/diyet", icon: UtensilsCrossed, label: "Diyet Programları" },
  { href: "/egitmen/supplement", icon: Pill, label: "Supplementler" },
  { href: "/egitmen/soru-cevap", icon: MessageSquare, label: "Soru Cevap Merkezi" },
  { href: "/egitmen/siparisler", icon: Package, label: "Siparişler" },
  { href: "/egitmen/ayarlar", icon: Settings, label: "Ayarlar" },
]

interface TrainerLayoutProps {
  children: React.ReactNode
}

type TrainerProfile = {
  firstName: string
  lastName: string
  avatar: string | null
}

export default function TrainerLayout({ children }: TrainerLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [questionBadge, setQuestionBadge] = useState<number>(0)
  const [trainerProfile, setTrainerProfile] = useState<TrainerProfile | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    const fetchQuestionStats = async () => {
      try {
        const response = await fetch("/api/trainer/questions?summary=1", {
          cache: "no-store",
        })
        if (!response.ok) {
          throw new Error("Sorular alınamadı")
        }
        const data = await response.json()
        const pending = Number(data?.stats?.pending ?? 0)
        const fresh = Number(data?.stats?.new ?? 0)
        setQuestionBadge(pending + fresh)
      } catch (error) {
        console.error("Trainer question badge fetch error:", error)
      }
    }

    const fetchTrainerProfile = async () => {
      try {
        const response = await fetch("/api/trainer/settings", { cache: "no-store" })
        if (!response.ok) return
        const data = await response.json()
        if (data?.trainer) {
          setTrainerProfile({
            firstName: data.trainer.firstName ?? "",
            lastName: data.trainer.lastName ?? "",
            avatar: data.trainer.avatar ?? null,
          })
        }
      } catch (error) {
        console.error("Trainer profile fetch error:", error)
      }
    }

    const handleTrainerUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ trainer: TrainerProfile }>).detail
      if (detail?.trainer) {
        setTrainerProfile({
          firstName: detail.trainer.firstName ?? "",
          lastName: detail.trainer.lastName ?? "",
          avatar: detail.trainer.avatar ?? null,
        })
      }
    }

    void fetchQuestionStats()
    void fetchTrainerProfile()
    window.addEventListener("trainer-profile-updated", handleTrainerUpdate as EventListener)
    return () => {
      window.removeEventListener("trainer-profile-updated", handleTrainerUpdate as EventListener)
    }
  }, [])

  const displayName = useMemo(() => {
    if (!trainerProfile) return "Ahmet Yılmaz"
    const name = `${trainerProfile.firstName ?? ""} ${trainerProfile.lastName ?? ""}`.trim()
    return name.length > 0 ? name : "Ahmet Yılmaz"
  }, [trainerProfile])

  const displayAvatar = trainerProfile?.avatar ?? "/trainer-avatar.png"

  const initials = useMemo(() => {
    const source = displayName
    return source
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "AY"
  }, [displayName])

  const handleSignOut = () => {
    signOut({
      callbackUrl: '/login',
      redirect: true
    })
  }

  return (
    <div className="trainer-theme min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <h1 className="font-semibold text-foreground">Mehmetcan PT Eğitmen Paneli</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-accent">3</Badge>
          </Button>
          <Avatar className="h-8 w-8">
            <AvatarImage src={displayAvatar} />
            <AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div
          className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out flex flex-col
          lg:relative lg:translate-x-0
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        >
          {/* Sidebar Header */}
          <div className="p-6 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sidebar-primary rounded-lg flex items-center justify-center">
                <Dumbbell className="h-6 w-6 text-sidebar-primary-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-sidebar-foreground">Mehmetcan PT</h2>
                  <Badge className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5">BETA</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Eğitmen Paneli</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-primary/10 hover:text-sidebar-primary"
                    }
                  `}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                  {item.label === "Soru Cevap Merkezi" && questionBadge > 0 && (
                    <Badge className="ml-auto bg-accent text-accent-foreground" data-slot="badge">
                      {questionBadge}
                    </Badge>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="mt-auto p-4 border-t border-sidebar-border bg-sidebar">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={displayAvatar} />
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sidebar-foreground truncate">{displayName}</p>
                <p className="text-sm text-muted-foreground truncate">Kişisel Antrenör</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/egitmen/ayarlar" className="flex-1" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
              <Button variant="ghost" size="sm" className="flex-1" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
        )}

        {/* Main Content */}
        <div className="flex-1 lg:ml-0">
          <main className="p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </div>
  )
}

export { TrainerLayout }
