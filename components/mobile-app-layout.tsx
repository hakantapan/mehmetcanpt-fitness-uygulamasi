"use client"

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { useSwipe } from "@/hooks/use-swipe"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  // Client Icons
  Home,
  User,
  Activity,
  Dumbbell,
  Apple,
  Pill,
  ChefHat,
  TrendingUp,
  MessageCircle,
  CreditCard,
  // Trainer Icons  
  Users,
  UtensilsCrossed,
  MessageSquare,
  Package,
  // Admin Icons
  LayoutDashboard,
  BarChart3,
  DollarSign,
  Settings,
  // Common Icons
  Bell,
  Search,
  Menu,
  LogOut,
  Shield,
  CheckCircle2,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { tr } from "date-fns/locale"

// Role-based navigation configurations
const navigationConfig = {
  CLIENT: [
    { id: "/bilgilerim", label: "Profil", icon: User, color: "text-rose-500", isMain: true },
    { id: "/antrenman", label: "Antrenman", icon: Dumbbell, color: "text-red-500", isMain: true },
    { id: "/beslenme", label: "Beslenme", icon: Apple, color: "text-green-500", isMain: true },
    { id: "/pt-formu", label: "PT Formu", icon: Activity, color: "text-purple-500", isMain: true },
    { id: "/supplement", label: "Supplement", icon: Pill, color: "text-orange-500", isMain: false },
    { id: "/tarifler", label: "Tarifler", icon: ChefHat, color: "text-yellow-500", isMain: false },
    { id: "/gelisim", label: "Gelişim", icon: TrendingUp, color: "text-indigo-500", isMain: false },
    { id: "/soru-merkezi", label: "Sorular", icon: MessageCircle, color: "text-pink-500", isMain: false },
    { id: "/paket-satin-al", label: "Paketler", icon: CreditCard, color: "text-cyan-500", isMain: false },
  ],
  TRAINER: [
    { id: "/egitmen", label: "Dashboard", icon: LayoutDashboard, color: "text-rose-500", isMain: true },
    { id: "/egitmen/danisanlar", label: "Danışanlar", icon: Users, color: "text-green-500", isMain: true },
    { id: "/egitmen/antrenman", label: "Antrenman", icon: Dumbbell, color: "text-red-500", isMain: true },
    { id: "/egitmen/diyet", label: "Diyet", icon: UtensilsCrossed, color: "text-orange-500", isMain: true },
    { id: "/egitmen/supplement", label: "Supplement", icon: Pill, color: "text-purple-500", isMain: false },
    { id: "/egitmen/soru-cevap", label: "Sorular", icon: MessageSquare, color: "text-pink-500", isMain: false },
    { id: "/egitmen/siparisler", label: "Siparişler", icon: Package, color: "text-cyan-500", isMain: false },
  ],
  ADMIN: [
    { id: "/admin", label: "Dashboard", icon: LayoutDashboard, color: "text-rose-500", isMain: true },
    { id: "/admin/kullanicilar", label: "Kullanıcılar", icon: Users, color: "text-green-500", isMain: true },
    { id: "/admin/istatistikler", label: "İstatistik", icon: BarChart3, color: "text-purple-500", isMain: true },
    { id: "/admin/loglar", label: "Loglar", icon: Bell, color: "text-orange-500", isMain: false },
    { id: "/admin/finansal", label: "Finansal", icon: DollarSign, color: "text-emerald-500", isMain: false },
    { id: "/admin/odeme-ayarlari", label: "Ödeme", icon: CreditCard, color: "text-pink-500", isMain: false },
    { id: "/admin/mail-ayarlari", label: "Mail", icon: Settings, color: "text-indigo-500", isMain: false },
  ],
}

interface MobileAppLayoutProps {
  children: React.ReactNode
}

export function MobileAppLayout({ children }: MobileAppLayoutProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [profile, setProfile] = useState<{ name: string; email: string; avatar: string | null } | null>(null)
  const [notificationCount, setNotificationCount] = useState(0)
  const [notifications, setNotifications] = useState<Array<{
    id: string
    type: 'question' | 'workout' | 'nutrition' | 'supplement'
    title: string
    message: string
    date: string
    link: string
  }>>([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)

  const userRole = session?.user?.role as keyof typeof navigationConfig || 'CLIENT'
  const navigation = navigationConfig[userRole] || navigationConfig.CLIENT
  const mainTabs = navigation.filter(item => item.isMain).slice(0, 4) // İlk 4 tab
  const moreTabs = navigation.filter(item => !item.isMain)

  // Swipe navigation between main tabs
  const currentTabIndex = mainTabs.findIndex(tab => tab.id === pathname)
  
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => {
      const nextIndex = currentTabIndex < mainTabs.length - 1 ? currentTabIndex + 1 : 0
      if (mainTabs[nextIndex]) {
        router.push(mainTabs[nextIndex].id)
      }
    },
    onSwipeRight: () => {
      const prevIndex = currentTabIndex > 0 ? currentTabIndex - 1 : mainTabs.length - 1
      if (mainTabs[prevIndex]) {
        router.push(mainTabs[prevIndex].id)
      }
    },
    onSwipeDown: () => {
      setShowMoreMenu(true)
    },
    minSwipeDistance: 100
  })

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
        let response: Response | null = null
        if (userRole === 'TRAINER') {
          response = await fetch('/api/trainer/settings', { cache: 'no-store' })
        } else {
          response = await fetch('/api/user/profile', { cache: 'no-store' })
        }

        if (!response || !response.ok) return
        const data = await response.json()
        if (isCancelled) return

        if (userRole === 'TRAINER' && data?.trainer) {
          setProfile({
            name: `${data.trainer.firstName ?? ''} ${data.trainer.lastName ?? ''}`.trim(),
            email: data.trainer.email ?? session?.user?.email ?? '',
            avatar: data.trainer.avatar ?? null,
          })
        } else if (data) {
          setProfile({
            name: data.name || '',
            email: data.email || session?.user?.email || '',
            avatar: data.avatar || null,
          })
        }
      } catch (error) {
        console.error('Mobile profile fetch error:', error)
      }
    }

    const fetchNotificationCount = async () => {
      try {
        if (userRole === 'CLIENT') {
          const response = await fetch('/api/client/notifications', { cache: 'no-store' })
          if (response.ok) {
            const data = await response.json()
            setNotificationCount(data?.count ?? 0)
            if (showNotifications) {
              setNotifications(data?.notifications ?? [])
            }
          } else {
            // Fallback: eski yöntem
            const fallbackResponse = await fetch('/api/client/questions', { cache: 'no-store' })
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json()
              const answeredCount = fallbackData?.stats?.answered ?? 0
              setNotificationCount(answeredCount)
            }
          }
        } else if (userRole === 'TRAINER') {
          const response = await fetch('/api/trainer/questions?summary=1', { cache: 'no-store' })
          if (response.ok) {
            const data = await response.json()
            const pending = Number(data?.stats?.pending ?? 0)
            const fresh = Number(data?.stats?.new ?? 0)
            setNotificationCount(pending + fresh)
          }
        } else if (userRole === 'ADMIN') {
          // Admin için şimdilik 0, gerekirse log sayısı eklenebilir
          setNotificationCount(0)
        }
      } catch (error) {
        console.error('Mobile notification count fetch error:', error)
      }
    }

    const fetchNotifications = async () => {
      if (userRole !== 'CLIENT') return
      
      try {
        setNotificationsLoading(true)
        const response = await fetch('/api/client/notifications', { cache: 'no-store' })
        if (response.ok) {
          const data = await response.json()
          setNotifications(data?.notifications ?? [])
        }
      } catch (error) {
        console.error('Mobile notifications fetch error:', error)
      } finally {
        setNotificationsLoading(false)
      }
    }

    const handleTrainerUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ trainer?: { firstName?: string; lastName?: string; avatar?: string | null } }>).detail
      const trainerDetail = detail?.trainer
      if (!trainerDetail) return

      const firstName = trainerDetail.firstName?.trim() ?? ""
      const lastName = trainerDetail.lastName?.trim() ?? ""
      const combinedName = `${firstName} ${lastName}`.trim()

      setProfile((prev) => ({
        name: combinedName || prev?.name || session?.user?.name || "",
        email: prev?.email ?? session?.user?.email ?? "",
        avatar: trainerDetail.avatar ?? prev?.avatar ?? session?.user?.image ?? null,
      }))
    }

    const handleUserUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ name?: string; email?: string; avatar?: string | null }>).detail
      if (!detail) return
      setProfile((prev) => ({
        name: detail.name ?? prev?.name ?? session?.user?.name ?? '',
        email: detail.email ?? prev?.email ?? session?.user?.email ?? '',
        avatar: detail.avatar ?? prev?.avatar ?? session?.user?.image ?? null,
      }))
    }

    void fetchProfile()
    void fetchNotificationCount()

    // Bildirim sayısını periyodik olarak güncelle (her 30 saniyede bir)
    const notificationInterval = setInterval(() => {
      void fetchNotificationCount()
    }, 30000)

    // Bildirim paneli açıldığında bildirimleri yükle
    if (showNotifications && userRole === 'CLIENT') {
      void fetchNotifications()
    }

    window.addEventListener('trainer-profile-updated', handleTrainerUpdate as EventListener)
    window.addEventListener('user-profile-updated', handleUserUpdate as EventListener)

    return () => {
      isCancelled = true
      clearInterval(notificationInterval)
      window.removeEventListener('trainer-profile-updated', handleTrainerUpdate as EventListener)
      window.removeEventListener('user-profile-updated', handleUserUpdate as EventListener)
    }
  }, [session?.user?.email, session?.user?.image, session?.user?.name, userRole, showNotifications])

  // Bildirim paneli açıldığında bildirimleri yükle
  useEffect(() => {
    if (showNotifications && userRole === 'CLIENT' && notifications.length === 0 && !notificationsLoading) {
      const fetchNotifications = async () => {
        try {
          setNotificationsLoading(true)
          const response = await fetch('/api/client/notifications', { cache: 'no-store' })
          if (response.ok) {
            const data = await response.json()
            setNotifications(data?.notifications ?? [])
          }
        } catch (error) {
          console.error('Mobile notifications fetch error:', error)
        } finally {
          setNotificationsLoading(false)
        }
      }
      void fetchNotifications()
    }
  }, [showNotifications, userRole, notifications.length, notificationsLoading])

  const displayName = useMemo(() => {
    const name = profile?.name || session?.user?.name || 'Kullanıcı'
    return name.trim().length > 0 ? name : 'Kullanıcı'
  }, [profile?.name, session?.user?.name])

  const displayEmail = profile?.email || session?.user?.email || ''
  const displayAvatar = profile?.avatar || session?.user?.image || (userRole === 'TRAINER'
    ? '/trainer-avatar.png'
    : userRole === 'ADMIN'
      ? '/admin-avatar.png'
      : '/fitness-user-avatar.png')

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
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{
        background: '#ffffff !important',
        color: '#374151 !important',
        colorScheme: 'light'
      }}
      {...swipeHandlers}
    >
      {/* Mobile Status Bar Simulation - Only on mobile */}
      <div className="h-6 bg-[#DC1D24] sm:hidden"></div>
      
      {/* Top Header - Mobile optimized */}
      <div
        className="px-4 py-2 sm:py-3 flex items-center justify-between shadow-sm"
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #f3f4f6',
          color: '#374151'
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-rose-400 to-rose-600 rounded-xl flex items-center justify-center">
            <Dumbbell className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-gray-800 text-lg">Mehmetcanpt Uzaktan Eğitim</h1>
              <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded font-medium">BETA</span>
            </div>
            <p className="text-sm text-gray-500 capitalize">{userRole.toLowerCase()} Panel</p>
          </div>
          <div className="sm:hidden">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-gray-800 text-base">Mehmetcanpt Uzaktan Eğitim</h1>
              <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded font-medium">BETA</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2">
          <Sheet open={showNotifications} onOpenChange={setShowNotifications}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="relative p-2"
                style={{ background: 'transparent', color: '#6b7280' }}
              >
                <Bell
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  style={{ color: '#6b7280' }}
                />
                {notificationCount > 0 && (
                  <Badge
                    className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 p-0 text-xs flex items-center justify-center"
                    style={{ background: '#dc2626', color: '#ffffff' }}
                  >
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-full sm:w-96 overflow-y-auto"
              style={{ background: '#ffffff', color: '#374151' }}
            >
              <SheetHeader className="pb-4 border-b">
                <SheetTitle className="text-lg font-bold" style={{ color: '#1f2937' }}>
                  Bildirimler
                </SheetTitle>
                <SheetDescription style={{ color: '#6b7280' }}>
                  {notificationCount > 0 ? `${notificationCount} yeni bildirim` : 'Bildirim yok'}
                </SheetDescription>
              </SheetHeader>
              
              <div className="mt-4 space-y-2">
                {notificationsLoading ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>Bildirimler yükleniyor...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Henüz bildirim yok</p>
                  </div>
                ) : (
                  notifications.map((notification) => {
                    const getIcon = () => {
                      switch (notification.type) {
                        case 'question':
                          return <MessageCircle className="w-5 h-5 text-blue-500" />
                        case 'workout':
                          return <Dumbbell className="w-5 h-5 text-red-500" />
                        case 'nutrition':
                          return <Apple className="w-5 h-5 text-green-500" />
                        case 'supplement':
                          return <Pill className="w-5 h-5 text-orange-500" />
                        default:
                          return <Bell className="w-5 h-5 text-gray-500" />
                      }
                    }

                    const getColor = () => {
                      switch (notification.type) {
                        case 'question':
                          return 'bg-blue-50 border-blue-200'
                        case 'workout':
                          return 'bg-red-50 border-red-200'
                        case 'nutrition':
                          return 'bg-green-50 border-green-200'
                        case 'supplement':
                          return 'bg-orange-50 border-orange-200'
                        default:
                          return 'bg-gray-50 border-gray-200'
                      }
                    }

                    return (
                      <div
                        key={notification.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${getColor()}`}
                        onClick={() => {
                          setShowNotifications(false)
                          router.push(notification.link)
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">{getIcon()}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm" style={{ color: '#1f2937' }}>
                              {notification.title}
                            </p>
                            <p className="text-xs mt-1 truncate" style={{ color: '#6b7280' }}>
                              {notification.message}
                            </p>
                            <p className="text-xs mt-2" style={{ color: '#9ca3af' }}>
                              {formatDistanceToNow(new Date(notification.date), { addSuffix: true, locale: tr })}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </SheetContent>
          </Sheet>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="p-1">
                <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                  <AvatarImage src={displayAvatar} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col items-start gap-1">
                <span className="text-xs text-muted-foreground">Hesabım</span>
                <span className="text-sm font-medium text-foreground">{displayName}</span>
                {displayEmail ? (
                  <span className="text-xs text-muted-foreground">{displayEmail}</span>
                ) : null}
              </DropdownMenuLabel>
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
                className="text-red-600 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Çıkış Yap</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content - Mobile optimized padding */}
      <div
        className="flex-1 overflow-y-auto pb-20 sm:pb-24"
        style={{ background: '#f9fafb' }}
      >
        <main className="p-3 sm:p-4 md:p-6" style={{ color: '#374151' }}>
          {children}
        </main>
      </div>

      {/* Bottom Navigation - Enhanced for mobile */}
      <div
        className="fixed bottom-0 left-0 right-0 shadow-lg z-50 safe-area-inset-bottom"
        style={{
          background: '#f9fafb',
          borderTop: '1px solid #f3f4f6'
        }}
      >
        <div className="grid grid-cols-5 h-16 sm:h-18">
          {/* Main 4 tabs */}
          {mainTabs.map((item) => {
            const isActive = pathname === item.id
            return (
              <Link key={item.id} href={item.id}>
                <div
                  className="flex flex-col items-center justify-center h-full transition-all duration-300 ease-in-out transform active:scale-95 relative group
                  hover:bg-rose-100 hover:shadow-sm
                  focus-within:bg-rose-100 focus-within:shadow-md
                  focus-within:ring-2 focus-within:ring-rose-300 focus-within:ring-opacity-50"
                  style={{
                    background: isActive ? '#fee2e2' : 'transparent',
                    color: isActive ? '#dc2626' : '#6b7280'
                  }}
                >
                  <item.icon
                    className="w-4 h-4 sm:w-5 sm:h-5 mb-1 transition-all duration-200"
                    style={{ color: isActive ? '#dc2626' : '#6b7280' }}
                  />
                  <span
                    className="text-xs font-medium transition-all duration-200"
                    style={{ color: isActive ? '#dc2626' : '#6b7280' }}
                  >
                    {item.label}
                  </span>
                  {isActive && (
                    <div
                      className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-1 rounded-b-full"
                      style={{ background: '#dc2626' }}
                    ></div>
                  )}
                </div>
              </Link>
            )
          })}
          
          {/* More menu - Enhanced with swipe indicator */}
          <Sheet open={showMoreMenu} onOpenChange={setShowMoreMenu}>
            <SheetTrigger asChild>
              <div
                className="flex flex-col items-center justify-center h-full cursor-pointer transition-all duration-200 active:scale-95 relative"
                style={{ background: 'transparent', color: '#6b7280' }}
              >
                <Menu
                  className="w-4 h-4 sm:w-5 sm:h-5 mb-1"
                  style={{ color: '#6b7280' }}
                />
                <span
                  className="text-xs font-medium"
                  style={{ color: '#6b7280' }}
                >
                  Daha
                </span>
                {moreTabs.length > 0 && (
                  <Badge
                    className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs"
                    style={{ background: '#dc2626', color: '#ffffff' }}
                  >
                    {moreTabs.length}
                  </Badge>
                )}
              </div>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="h-[60%] sm:h-[50%]"
              style={{
                background: '#ffffff',
                color: '#374151',
                borderTop: '1px solid #e5e7eb'
              }}
            >
              <SheetHeader className="pb-4">
                <div
                  className="w-12 h-1 rounded-full mx-auto mb-4"
                  style={{ background: '#d1d5db' }}
                ></div>
                <SheetTitle
                  className="text-center"
                  style={{ color: '#1f2937' }}
                >
                  Tüm Menüler
                </SheetTitle>
                <SheetDescription
                  className="text-center"
                  style={{ color: '#6b7280' }}
                >
                  Diğer sayfalara buradan erişebilirsiniz veya yukarı kaydırın
                </SheetDescription>
              </SheetHeader>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mt-6">
                {moreTabs.map((item) => {
                  const isActive = pathname === item.id
                  return (
                    <Link
                      key={item.id}
                      href={item.id}
                      onClick={() => setShowMoreMenu(false)}
                    >
                      <div
                        className="p-3 sm:p-4 rounded-xl transition-all duration-300 ease-in-out transform active:scale-95 group
                        hover:bg-rose-100 hover:shadow-sm
                        focus-within:bg-rose-100 focus-within:shadow-md
                        focus-within:ring-2 focus-within:ring-rose-300 focus-within:ring-opacity-50"
                        style={{
                          background: isActive ? '#fee2e2' : '#ffffff',
                          border: isActive ? '1px solid #fecaca' : '1px solid #e5e7eb',
                          boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                        }}
                      >
                        <item.icon
                          className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2"
                          style={{ color: isActive ? '#dc2626' : '#6b7280' }}
                        />
                        <p
                          className="text-xs sm:text-sm text-center font-medium truncate"
                          style={{ color: isActive ? '#dc2626' : '#1f2937' }}
                        >
                          {item.label}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  )
}

export default MobileAppLayout
