"use client"

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useSession, signOut } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  User,
  Dumbbell,
  Apple,
  Pill,
  ChefHat,
  Flame,
  FileText,
  MessageCircle,
  TrendingUp,
  Menu,
  X,
  CreditCard,
  LogOut,
} from "lucide-react"

const menuItems = [
  
  { id: "/bilgilerim", label: "Bilgilerim", icon: User },
  { id: "/antrenman", label: "Antrenman Programı", icon: Dumbbell },
  { id: "/beslenme", label: "Beslenme Programı", icon: Apple },
  { id: "/supplement", label: "Supplement Takviyeler", icon: Pill },
  { id: "/tarifler", label: "Tarifler", icon: ChefHat },
  { id: "/isinma", label: "Isınma ve Esneme", icon: Flame },
  { id: "/pt-formu", label: "PT Formu", icon: FileText },
  { id: "/soru-merkezi", label: "Soru Merkezi", icon: MessageCircle },
  { id: "/gelisim", label: "Gelişim Süreci", icon: TrendingUp },
  { id: "/paket-satin-al", label: "Paket Satın Al", icon: CreditCard },
]

export function FitnessLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profile, setProfile] = useState<{ name: string; email: string; avatar: string | null } | null>(null)

  const handleSignOut = () => {
    signOut({ 
      callbackUrl: '/login',
      redirect: true 
    })
  }

  useEffect(() => {
    let isCancelled = false

    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/user/profile', { cache: 'no-store' })
        if (!response.ok) return
        const data = await response.json()
        if (!isCancelled) {
          setProfile({
            name: data.name || '',
            email: data.email || session?.user?.email || '',
            avatar: data.avatar || null,
          })
        }
      } catch (error) {
        console.error('Client profile fetch error:', error)
      }
    }

    const handleProfileUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ name?: string; email?: string; avatar?: string | null }>).detail
      if (!detail) return
      setProfile((prev) => ({
        name: detail.name ?? prev?.name ?? session?.user?.name ?? '',
        email: detail.email ?? prev?.email ?? session?.user?.email ?? '',
        avatar: detail.avatar ?? prev?.avatar ?? session?.user?.image ?? null,
      }))
    }

    void fetchProfile()
    window.addEventListener('user-profile-updated', handleProfileUpdate as EventListener)

    return () => {
      isCancelled = true
      window.removeEventListener('user-profile-updated', handleProfileUpdate as EventListener)
    }
  }, [session?.user?.email, session?.user?.image, session?.user?.name])

  const displayName = useMemo(() => {
    const name = profile?.name || session?.user?.name || 'Kullanıcı'
    return name.trim().length > 0 ? name : 'Kullanıcı'
  }, [profile?.name, session?.user?.name])

  const displayEmail = profile?.email || session?.user?.email || ''
  const displayAvatar = profile?.avatar || session?.user?.image || '/fitness-user-avatar.png'
  const initials = useMemo(() => {
    return (
      displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase() || 'U'
    )
  }, [displayName])

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="font-bold text-lg text-foreground">Mehmetcan PT Online</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-card border-r border-border">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="font-bold text-xl text-foreground">Mehmetcan PT Online</h1>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.id
              return (
                <Link key={item.id} href={item.id}>
                  <Button variant={isActive ? "default" : "ghost"} className="w-full justify-start gap-3 h-12">
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Button>
                </Link>
              )
            })}
          </nav>
          
          {/* User Profile Section */}
          <div className="px-4 py-4 border-t border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-3 px-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={displayAvatar} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-medium">{displayName}</span>
                    <span className="text-xs text-muted-foreground">{displayEmail}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Hesabım</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/bilgilerim" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleSignOut}
                  className="flex items-center text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Çıkış Yap</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-background">
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <Dumbbell className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <h1 className="font-bold text-lg text-foreground">Mehmetcan PT Online</h1>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <nav className="space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.id
                  return (
                    <Link key={item.id} href={item.id}>
                      <Button
                        variant={isActive ? "default" : "ghost"}
                        className="w-full justify-start gap-3 h-12"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Icon className="w-5 h-5" />
                        {item.label}
                      </Button>
                    </Link>
                  )
                })}
              </nav>
              
              {/* User Profile Section - Mobile */}
              <div className="mt-8 pt-8 border-t border-border">
                <div className="flex items-center gap-3 px-4 py-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={displayAvatar} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{displayName}</p>
                    <p className="text-xs text-muted-foreground">{displayEmail}</p>
                  </div>
                </div>
                
                <div className="px-4 py-2 space-y-1">
                  <Link href="/bilgilerim">
                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => setMobileMenuOpen(false)}>
                      <User className="w-4 h-4" />
                      Profil
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-3 text-red-600"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      handleSignOut()
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                    Çıkış Yap
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 lg:ml-64">
          <main className="p-4 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  )
}
