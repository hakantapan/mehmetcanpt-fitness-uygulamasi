"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import ResponsiveLayout from "@/components/responsive-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Crown,
  CreditCard,
  Loader2,
  Lock,
  Shield,
  Star,
  Zap,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type FitnessPackageOption = {
  id: string
  slug: string
  name: string
  headline?: string | null
  description?: string | null
  price: number
  originalPrice?: number | null
  currency: string
  durationInDays: number
  isPopular: boolean
  themeColor?: string | null
  iconName?: string | null
  features: string[]
  notIncluded: string[]
}

type ManualPaymentAccountPublic = {
  id: string
  bankName: string
  accountName: string
  iban: string
  accountNumber?: string | null
  branchName?: string | null
  description?: string | null
}

type ProfileResponse = {
  name?: string
  phone?: string
  email?: string
  goal?: string
  activityLevel?: string
}

type PaytrSession = {
  token: string
  iframeUrl: string
  merchantOid: string
}

const STEP_CONFIG = [
  {
    id: 1,
    title: "Paket Seçimi",
    description: "Hedefine uygun paketi belirle",
  },
  {
    id: 2,
    title: "Bilgilerini Onayla",
    description: "Kişisel bilgilerini ve paket detayını doğrula",
  },
  {
    id: 3,
    title: "Ödeme",
    description: "PayTR güvencesiyle işlemini tamamla",
  },
] as const

const PACKAGE_ICON_MAP: Record<string, LucideIcon> = {
  zap: Zap,
  star: Star,
  crown: Crown,
}

const formatCurrency = (value: number, currency = "TRY") => {
  try {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value)
  } catch (_error) {
    return `${value} ${currency}`
  }
}

const StepIndicator = ({ currentStep }: { currentStep: number }) => (
  <ol className="grid gap-4 md:grid-cols-3">
    {STEP_CONFIG.map((step, index) => {
      const isActive = step.id === currentStep
      const isCompleted = step.id < currentStep
      return (
        <li
          key={step.id}
          className={cn(
            "rounded-lg border p-4 transition-colors",
            isActive ? "border-primary bg-primary/5" : "border-border",
            isCompleted ? "border-emerald-500 bg-emerald-50" : "",
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold",
                isCompleted
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30 text-muted-foreground",
              )}
            >
              {isCompleted ? <Check className="h-5 w-5" /> : index + 1}
            </div>
            <div>
              <p className={cn("font-semibold", isActive ? "text-primary" : "text-foreground")}>
                {step.title}
              </p>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          </div>
        </li>
      )
    })}
  </ol>
)

export default function PackagePurchasePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [packages, setPackages] = useState<FitnessPackageOption[]>([])
  const [loadingPackages, setLoadingPackages] = useState(true)
  const [packagesError, setPackagesError] = useState<string | null>(null)

  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<number>(1)

  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  const [installmentCount, setInstallmentCount] = useState("0")
  const [paytrSession, setPaytrSession] = useState<PaytrSession | null>(null)
  const [checkoutState, setCheckoutState] = useState<"idle" | "loading" | "ready" | "error">("idle")
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [iframeHeight, setIframeHeight] = useState(780)
  const [manualAccounts, setManualAccounts] = useState<ManualPaymentAccountPublic[]>([])
  const [manualAccountsLoading, setManualAccountsLoading] = useState(false)

  const source = searchParams?.get("source") ?? null

  useEffect(() => {
    let isCancelled = false
    const loadPackages = async () => {
      try {
        setLoadingPackages(true)
        setPackagesError(null)
        const response = await fetch("/api/packages", { cache: "no-store" })
        if (!response.ok) {
          throw new Error("Paketler yüklenemedi")
        }
        const data = await response.json()
        if (isCancelled) return

        const incoming = Array.isArray(data?.packages) ? (data.packages as FitnessPackageOption[]) : []
        setPackages(incoming)

        const preselected = incoming.find((pkg) => pkg.isPopular) ?? incoming[0] ?? null
        setSelectedPackageId(preselected ? preselected.id : null)
      } catch (error) {
        if (!isCancelled) {
          console.error("Packages fetch error:", error)
          setPackagesError("Paketler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.")
        }
      } finally {
        if (!isCancelled) {
          setLoadingPackages(false)
        }
      }
    }

    void loadPackages()

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    let isCancelled = false
    const loadManualAccounts = async () => {
      try {
        setManualAccountsLoading(true)
        const response = await fetch("/api/manual-payments", { cache: "no-store" })
        const data = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(data?.error || "Havale bilgileri yüklenemedi")
        }
        if (!isCancelled) {
          setManualAccounts(Array.isArray(data?.accounts) ? (data.accounts as ManualPaymentAccountPublic[]) : [])
        }
      } catch (error) {
        console.error("Manual accounts fetch error:", error)
      } finally {
        if (!isCancelled) {
          setManualAccountsLoading(false)
        }
      }
    }

    void loadManualAccounts()
    return () => {
      isCancelled = true
    }
  }, [])

  const selectedPackage = useMemo(
    () => packages.find((pkg) => pkg.id === selectedPackageId) ?? null,
    [packages, selectedPackageId],
  )

  const selectedPackagePricing = useMemo(() => {
    if (!selectedPackage) {
      return { hasDiscount: false, discountAmount: 0, discountPercent: 0 }
    }

    const hasDiscount =
      typeof selectedPackage.originalPrice === "number" && selectedPackage.originalPrice > selectedPackage.price
    const discountAmount = hasDiscount
      ? (selectedPackage.originalPrice as number) - selectedPackage.price
      : 0
    const discountPercent =
      hasDiscount && selectedPackage.originalPrice
        ? Math.round((discountAmount / (selectedPackage.originalPrice as number)) * 100)
        : 0

    return { hasDiscount, discountAmount, discountPercent }
  }, [selectedPackage])

  const loadProfile = useCallback(async () => {
    try {
      setProfileLoading(true)
      setProfileError(null)
      const response = await fetch("/api/user/profile", { cache: "no-store" })

      if (response.status === 401) {
        setProfileError("Devam etmek için oturum açmanız gerekiyor.")
        return
      }

      if (!response.ok) {
        throw new Error("Profil bilgileri alınamadı")
      }

      const data = (await response.json()) as ProfileResponse
      setProfile(data)
    } catch (error) {
      console.error("Profile fetch error:", error)
      setProfileError("Profil bilgileri alınamadı. Lütfen daha sonra tekrar deneyin.")
    } finally {
      setProfileLoading(false)
    }
  }, [])

  useEffect(() => {
    if (currentStep === 2 && !profile && !profileLoading && !profileError) {
      void loadProfile()
    }
  }, [currentStep, loadProfile, profile, profileLoading, profileError])

  const initiateCheckout = useCallback(
    async (force?: boolean) => {
      if (!selectedPackage) return
      if (!force && checkoutState === "loading") return
      setCheckoutState("loading")
      setCheckoutError(null)

      try {
        const response = await fetch("/api/paytr/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            packageId: selectedPackage.id,
            installmentCount,
            source,
          }),
        })

        if (response.status === 401) {
          router.push(`/login?callbackUrl=${encodeURIComponent("/paket-satin-al")}`)
          return
        }

        if (!response.ok) {
          const data = await response.json().catch(() => null)
          throw new Error(data?.error || "Ödeme ekranı oluşturulamadı")
        }

        const data = (await response.json()) as PaytrSession
        setPaytrSession(data)
        setCheckoutState("ready")
      } catch (error) {
        console.error("PayTR checkout init error:", error)
        setCheckoutState("error")
        setCheckoutError(error instanceof Error ? error.message : "Ödeme ekranı oluşturulamadı.")
      }
    },
    [installmentCount, router, selectedPackage, source, checkoutState],
  )

  useEffect(() => {
    if (currentStep === 3 && selectedPackage) {
      void initiateCheckout()
    }
  }, [currentStep, initiateCheckout, selectedPackage])

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (typeof event.data !== "string") return
      if (!event.data.startsWith("paytriframe:")) return
      const height = Number.parseInt(event.data.split(":")[1] ?? "", 10)
      if (!Number.isNaN(height) && height > 0) {
        setIframeHeight(Math.max(height, 640))
      }
    }

    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [])

  const handleNextFromStep1 = () => {
    if (!selectedPackage) {
      toast({
        title: "Paket seçimi gerekli",
        description: "Devam etmeden önce bir paket seçmeniz gerekiyor.",
        variant: "destructive",
      })
      return
    }
    setCurrentStep(2)
  }

  const handleBackToPackages = () => {
    setCurrentStep(1)
    setCheckoutState("idle")
    setPaytrSession(null)
    setCheckoutError(null)
  }

  const handleProceedToPayment = () => {
    if (!selectedPackage) {
      toast({
        title: "Paket seçimi gerekli",
        description: "Devam etmeden önce bir paket seçmeniz gerekiyor.",
        variant: "destructive",
      })
      return
    }
    setCurrentStep(3)
  }

  const sourceMessages: Record<string, { title: string; description: string }> = {
    antrenman: {
      title: "Antrenman programı kilitli",
      description: "Kişisel antrenman rutinine devam edebilmek için abonelik paketlerinden birini seçmelisin.",
    },
    beslenme: {
      title: "Beslenme planı için paket gerekli",
      description: "Detaylı beslenme ve alışveriş planlarına erişmek için aktif paket gerekir.",
    },
    supplement: {
      title: "Supplement önerileri premium içeriktir",
      description: "Sana özel supplement planı görmek için paket satın alman gerekiyor.",
    },
    gelisim: {
      title: "Gelişim raporları premium",
      description: "İlerlemeni takip etmek için paket seç ve tüm grafiklerin kilidini aç.",
    },
    "pt-formu": {
      title: "PT formu için paket gerekir",
      description: "Eğitmenine iletilecek PT formunu doldurmadan önce uygun paketi seçmelisin.",
    },
  }

  const defaultSourceMessage = {
    title: "Premium içerik",
    description: "Bu bölüme erişmek için aktif bir pakete ihtiyaç bulunuyor. Paketini seçerek devam edebilirsin.",
  }

  const sourceMessage = source ? sourceMessages[source] ?? defaultSourceMessage : null

  return (
    <ResponsiveLayout>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="space-y-4 text-center">
          <Badge variant="outline" className="inline-flex items-center gap-2 text-xs uppercase tracking-wide">
            <Shield className="h-3.5 w-3.5 text-primary" />
            Güvenli ödeme altyapısı
          </Badge>
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">Fitness Paketini Seç, Hemen Başla</h1>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Hedeflerinize en uygun paketi seçin, bilgilerinizi onaylayın ve PayTR altyapısıyla güvenle ödeme yapın.
            Tüm süreç adım adım yanınızda.
          </p>
        </div>

        <StepIndicator currentStep={currentStep} />

        {sourceMessage ? (
          <Alert className="border-orange-200 bg-orange-50 text-orange-900">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <AlertTitle>{sourceMessage.title}</AlertTitle>
            <AlertDescription>{sourceMessage.description}</AlertDescription>
          </Alert>
        ) : null}

        {currentStep === 1 ? (
          <div className="space-y-6 pb-24 md:pb-0">
            {packagesError ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-5 w-5" />
                <AlertTitle>Paketler yüklenemedi</AlertTitle>
                <AlertDescription>{packagesError}</AlertDescription>
              </Alert>
            ) : null}
            <div className="grid gap-6 md:grid-cols-3">
              {loadingPackages
                ? Array.from({ length: 3 }).map((_, index) => (
                    <Card key={`package-skeleton-${index}`} className="p-6 space-y-4">
                      <div className="flex justify-center">
                        <Skeleton className="h-16 w-16 rounded-full" />
                      </div>
                      <Skeleton className="mx-auto h-5 w-24" />
                      <Skeleton className="mx-auto h-4 w-32" />
                      <div className="space-y-2">
                        {Array.from({ length: 4 }).map((__, featureIndex) => (
                          <Skeleton key={`feature-${featureIndex}`} className="mx-auto h-3 w-5/6" />
                        ))}
                      </div>
                      <Skeleton className="h-10 w-full" />
                    </Card>
                  ))
                : packages.length > 0
                  ? packages.map((pkg) => {
                      const IconComponent =
                        pkg.iconName && PACKAGE_ICON_MAP[pkg.iconName.toLowerCase()]
                          ? PACKAGE_ICON_MAP[pkg.iconName.toLowerCase()]
                          : CreditCard
                      const isSelected = selectedPackageId === pkg.id
                      const durationLabel =
                        pkg.durationInDays % 30 === 0
                          ? `${Math.max(1, Math.round(pkg.durationInDays / 30))} Ay`
                          : `${pkg.durationInDays} Gün`
                      const hasDiscount =
                        typeof pkg.originalPrice === "number" && pkg.originalPrice > pkg.price
                      return (
                        <Card
                          key={pkg.id}
                          className={cn(
                            "relative cursor-pointer transition-all duration-200",
                            isSelected ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md",
                            pkg.isPopular ? "border-primary" : "",
                          )}
                          onClick={() => setSelectedPackageId(pkg.id)}
                        >
                          {pkg.isPopular && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                              <Badge className="bg-primary text-primary-foreground shadow">
                                En Çok Tercih Edilen
                              </Badge>
                            </div>
                          )}
                          <CardHeader className="space-y-3 pb-3 text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <IconComponent className="h-8 w-8" />
                            </div>
                            <div className="space-y-1">
                              <CardTitle className="text-xl">{pkg.name}</CardTitle>
                              {pkg.headline ? (
                                <CardDescription className="text-sm">{pkg.headline}</CardDescription>
                              ) : null}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-baseline justify-center gap-2">
                                <span className="text-3xl font-bold text-foreground">
                                  {formatCurrency(pkg.price, pkg.currency)}
                                </span>
                                {hasDiscount ? (
                                  <span className="text-sm text-muted-foreground line-through">
                                    {formatCurrency(pkg.originalPrice!, pkg.currency)}
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-sm text-muted-foreground">{durationLabel}</p>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm text-foreground">Paket İçeriği:</h4>
                              {pkg.features.map((feature, index) => (
                                <div key={index} className="flex items-start gap-2 text-left">
                                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                                  <span className="text-sm text-muted-foreground">{feature}</span>
                                </div>
                              ))}
                            </div>
                            {pkg.notIncluded.length > 0 && (
                              <div className="space-y-2 border-t pt-2">
                                <h4 className="font-medium text-sm text-muted-foreground">Dahil Değil:</h4>
                                {pkg.notIncluded.map((feature, index) => (
                                  <div key={index} className="flex items-start gap-2 text-left">
                                    <span className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground">×</span>
                                    <span className="text-sm text-muted-foreground">{feature}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                          <CardFooter>
                            <Button className="w-full" variant={isSelected ? "default" : "outline"}>
                              {isSelected ? "Seçildi" : "Paketi Seç"}
                            </Button>
                          </CardFooter>
                        </Card>
                      )
                    })
                  : !packagesError ? (
                    <Alert className="md:col-span-3">
                      <AlertTriangle className="h-5 w-5" />
                      <AlertTitle>Paket bulunamadı</AlertTitle>
                      <AlertDescription>
                        Şu anda satın alabileceğiniz paket bulunamadı. Lütfen daha sonra tekrar deneyin.
                      </AlertDescription>
                    </Alert>
                  ) : null}
            </div>

            <div className="sticky bottom-0 left-0 right-0 z-30 flex flex-col items-center gap-3 border-t bg-background/95 px-4 pb-4 pt-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80 md:static md:flex-row md:justify-between md:border-transparent md:bg-transparent md:px-0 md:pb-0 md:pt-6 md:shadow-none">
              <div className="text-sm text-muted-foreground text-center md:text-left">
                PayTR güvencesiyle kredi veya banka kartınızla güvenli ödeme yapabilirsiniz.
              </div>
              <div className="flex w-full flex-col-reverse gap-3 sm:w-auto sm:flex-row">
                <Button variant="secondary" onClick={() => router.push("/")} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Ana sayfaya dön
                </Button>
                <Button onClick={handleNextFromStep1} className="gap-2" disabled={!selectedPackage}>
                  Devam Et
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {currentStep === 2 && selectedPackage ? (
          <div className="grid gap-6 pb-24 md:pb-0 lg:grid-cols-[2fr,1.2fr]">
            <Card>
              <CardHeader>
                <CardTitle>Paket Özeti</CardTitle>
                <CardDescription>Devam etmeden önce seçtiğin paketi gözden geçir.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-foreground">{selectedPackage.name}</p>
                    {selectedPackage.description ? (
                      <p className="text-sm text-muted-foreground">{selectedPackage.description}</p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrency(selectedPackage.price, selectedPackage.currency)}
                    </p>
                    {selectedPackagePricing.hasDiscount ? (
                      <p className="text-xs text-muted-foreground">
                        % {selectedPackagePricing.discountPercent} indirim
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Süre</p>
                    <p className="font-medium text-foreground">
                      {selectedPackage.durationInDays % 30 === 0
                        ? `${Math.max(1, Math.round(selectedPackage.durationInDays / 30))} Ay`
                        : `${selectedPackage.durationInDays} Gün`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Fiyat</p>
                    <p className="font-medium text-foreground">
                      {formatCurrency(selectedPackage.price, selectedPackage.currency)}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs uppercase text-muted-foreground">İçerik</p>
                    <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                      {selectedPackage.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Taksit Seçeneği</p>
                  <Select value={installmentCount} onValueChange={setInstallmentCount}>
                    <SelectTrigger className="w-full sm:w-64">
                      <SelectValue placeholder="Taksit seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Peşin</SelectItem>
                      <SelectItem value="2">2 Taksit</SelectItem>
                      <SelectItem value="3">3 Taksit</SelectItem>
                      <SelectItem value="6">6 Taksit</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Maksimum taksit sayısı banka ve kart türüne göre değişebilir. PayTR ekranında uygun taksit planını
                    seçebilirsiniz.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Kişisel Bilgiler</CardTitle>
                <CardDescription>
                  Ödeme sırasında kullanılacak iletişim bilgileriniz. Gerekirse hesabım sayfasından güncelleyebilirsiniz.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {profileLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ) : profileError ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Bilgiler alınamadı</AlertTitle>
                    <AlertDescription>{profileError}</AlertDescription>
                  </Alert>
                ) : profile ? (
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Ad Soyad</p>
                      <p className="font-medium text-foreground">{profile.name || "Belirtilmemiş"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">E-posta</p>
                      <p className="font-medium text-foreground">{profile.email || "Belirtilmemiş"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Telefon</p>
                      <p className="font-medium text-foreground">{profile.phone || "Belirtilmemiş"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Hedef</p>
                      <p className="font-medium text-foreground">{profile.goal || "Belirtilmemiş"}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Profil bilgilerinizi görüntülemek için giriş yapınız.
                  </p>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="outline" onClick={() => router.push("/bilgilerim")} className="w-full">
                  Bilgilerimi Güncelle
                </Button>
              </CardFooter>
            </Card>

            <div className="sticky bottom-0 left-0 right-0 z-30 flex flex-col gap-3 border-t bg-background/95 px-4 py-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:static sm:flex-row sm:justify-between sm:border-transparent sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none">
              <Button variant="ghost" onClick={handleBackToPackages} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Geri dön
              </Button>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={handleProceedToPayment} className="gap-2" disabled={!selectedPackage}>
                  Ödeme Adımına Geç
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {currentStep === 3 && selectedPackage ? (
          <div className="grid gap-6 pb-24 md:pb-0 lg:grid-cols-[1.4fr,1fr]">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>PayTR Güvenli Ödeme</CardTitle>
                <CardDescription>
                  Ödeme işleminizi PayTR güvenli iframe üzerinden gerçekleştireceksiniz. Risk analizine göre ödeme
                  sırasında kart doğrulaması istenebilir.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {checkoutState === "loading" ? (
                  <div className="flex h-[520px] flex-col items-center justify-center gap-3 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    PayTR ödeme ekranı hazırlanıyor...
                  </div>
                ) : checkoutState === "error" ? (
                  <div className="space-y-4 rounded-lg border border-dashed p-6 text-center">
                    <Alert variant="destructive" className="text-left">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Ödeme ekranı yüklenemedi</AlertTitle>
                      <AlertDescription>{checkoutError ?? "Lütfen daha sonra tekrar deneyin."}</AlertDescription>
                    </Alert>
                    <div className="flex justify-center">
                      <Button onClick={() => initiateCheckout(true)} className="gap-2">
                        Tekrar Dene
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </Button>
                    </div>
                  </div>
                ) : paytrSession ? (
                  <div className="space-y-4">
                    <iframe
                      key={paytrSession.token}
                      id="paytriframe"
                      src={paytrSession.iframeUrl}
                      frameBorder="0"
                      scrolling="no"
                      style={{ width: "100%", minHeight: `${iframeHeight}px` }}
                      className="w-full overflow-hidden rounded-lg border bg-background"
                    />
                    <p className="text-xs text-muted-foreground">
                      Ödeme tamamlandığında sonuç sayfasına yönlendirileceksiniz. Bir sorun yaşarsanız{" "}
                      <Button variant="link" size="sm" className="px-0" onClick={() => initiateCheckout(true)}>
                        ödeme ekranını yeniden yükleyin.
                      </Button>
                    </p>
                  </div>
                ) : (
                  <div className="flex h-[520px] flex-col items-center justify-center gap-3 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    Ödeme ekranı hazırlanıyor...
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Özet</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Paket</span>
                    <span className="font-medium text-foreground">{selectedPackage.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Süre</span>
                    <span className="font-medium text-foreground">
                      {selectedPackage.durationInDays % 30 === 0
                        ? `${Math.max(1, Math.round(selectedPackage.durationInDays / 30))} Ay`
                        : `${selectedPackage.durationInDays} Gün`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Taksit</span>
                    <span className="font-medium text-foreground">
                      {installmentCount === "0" ? "Peşin" : `${installmentCount} Taksit`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-3 text-base text-foreground">
                    <span>Ödenecek Tutar</span>
                    <span className="font-semibold">
                      {formatCurrency(selectedPackage.price, selectedPackage.currency)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {manualAccountsLoading ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Havale / EFT Bilgileri</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Banka hesapları yükleniyor...</p>
                  </CardContent>
                </Card>
              ) : manualAccounts.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Havale / EFT ile Öde</CardTitle>
                    <CardDescription>
                      Banka üzerinden ödeme yapmak istersen aşağıdaki hesaplardan birine transfer yapabilir, dekontunu bize iletebilirsin.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {manualAccounts.map((account) => (
                      <div key={account.id} className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                        <div className="flex flex-col gap-1">
                          <p className="text-base font-semibold text-foreground">{account.bankName}</p>
                          <p className="text-foreground">{account.accountName}</p>
                          <p className="font-mono text-sm text-primary">{account.iban}</p>
                          {account.accountNumber ? (
                            <p>Hesap No: <span className="font-medium text-foreground">{account.accountNumber}</span></p>
                          ) : null}
                          {account.branchName ? (
                            <p>Şube: <span className="font-medium text-foreground">{account.branchName}</span></p>
                          ) : null}
                          {account.description ? (
                            <p className="text-xs italic text-muted-foreground">{account.description}</p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : null}

              <Card>
                <CardHeader>
                  <CardTitle>Ödeme Sonrası</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p className="flex items-start gap-2">
                    <Lock className="mt-0.5 h-4 w-4 text-primary" />
                    PayTR tarafından korunan güvenli bir ödeme sayfasına yönlendirildiniz. Kart bilgileriniz asla bizim
                    tarafımızdan saklanmaz.
                  </p>
                  <p className="flex items-start gap-2">
                    <CreditCard className="mt-0.5 h-4 w-4 text-primary" />
                    Ödeme tamamlandığında otomatik olarak sonuç sayfasına yönlendirileceksiniz. Paketiniz birkaç saniye
                    içinde aktive edilir.
                  </p>
                  <p className="flex items-start gap-2">
                    <Shield className="mt-0.5 h-4 w-4 text-primary" />
                    Herhangi bir sorun yaşarsanız destek ekibimizle iletişime geçebilirsiniz.
                  </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-2 text-xs text-muted-foreground">
                  <p>
                    Ödeme sırasında farklı sekmeye geçmeyin ve sayfayı kapatmayın. Tarayıcıyı yenilemeniz gerekirse PayTR
                    ekranını yeniden talep etmelisiniz.
                  </p>
                </CardFooter>
              </Card>

              <div className="sticky bottom-0 left-0 right-0 z-30 flex flex-col gap-3 border-t bg-background/95 px-4 py-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:static sm:flex-row sm:justify-between sm:border-transparent sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none">
                <Button variant="ghost" onClick={handleBackToPackages} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Paketi değiştir
                </Button>
                <Button variant="outline" onClick={() => initiateCheckout(true)} className="gap-2">
                  Ödeme ekranını yenile
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </ResponsiveLayout>
  )
}
