'use client'

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  Activity,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Crown,
  Dumbbell,
  Flame,
  HeartPulse,
  Shield,
  Sparkles,
  Star,
  UtensilsCrossed,
  Zap,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

type FitnessPackageSummary = {
  id: string
  slug: string | null
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
}

type RecipeHighlight = {
  id: string
  name: string
  category: string
  image: string
  rating: number
  calories: number
  protein: number
  tags: string[]
}

type GenderFilter = "female" | "male"

type PhoneShowcaseSlide = {
  id: string
  label: string
  description: string
  screenSrc: string
}

const PACKAGE_ICON_MAP: Record<string, LucideIcon> = {
  zap: Zap,
  star: Star,
  crown: Crown,
  dumbbell: Dumbbell,
  activity: Activity,
}

const FEATURE_CATEGORIES: Array<{
  title: string
  accentClass: string
  icon: LucideIcon
  items: string[]
}> = [
  {
    title: "Antrenman",
    accentClass: "border-red-500/40 bg-red-500/10 text-red-900 dark:text-red-100",
    icon: Activity,
    items: [
      "Hedefine göre kişiselleştirilmiş program",
      "Haftalık güncellenen antrenman planları",
      "Video destekli hareket kütüphanesi",
    ],
  },
  {
    title: "Beslenme",
    accentClass: "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100",
    icon: UtensilsCrossed,
    items: [
      "Makro değerlerine uygun menüler",
      "Hazır alışveriş listeleri ve tarifler",
      "Supplement eşleşmeleriyle destek",
    ],
  },
  {
    title: "Supplement",
    accentClass: "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
    icon: Flame,
    items: [
      "Hedefine uygun supplement planı",
      "Döneme göre dozaj ve kullanım rehberi",
      "Performans artırıcı bilgi içerikleri",
    ],
  },
  {
    title: "Video",
    accentClass: "border-sky-500/40 bg-sky-500/10 text-sky-900 dark:text-sky-100",
    icon: Sparkles,
    items: [
      "Detaylı hareket açıklamaları",
      "Her seviyeye uygun varyasyonlar",
      "Yeni içeriklerle düzenli güncelleme",
    ],
  },
  {
    title: "Soru-Cevap",
    accentClass: "border-purple-500/40 bg-purple-500/10 text-purple-900 dark:text-purple-100",
    icon: Shield,
    items: [
      "Eğitmenle sınırsız mesajlaşma",
      "Özel durumlar için hızlı geri dönüş",
      "Performans raporlarıyla birlikte değerlendirme",
    ],
  },
  {
    title: "Gelişim",
    accentClass: "border-slate-500/40 bg-slate-500/10 text-slate-900 dark:text-slate-100",
    icon: BarChart3,
    items: [
      "İlerlemeni grafiklerle takip et",
      "Ölçüm ve fotoğraf yükleme desteği",
      "Her ay ayrıntılı değerlendirme raporu",
    ],
  },
]

const formatCurrency = (value: number, currency: string) => {
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

export default function LandingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [selectedGender, setSelectedGender] = useState<GenderFilter>("female")
  const [packages, setPackages] = useState<FitnessPackageSummary[]>([])
  const [packagesLoading, setPackagesLoading] = useState(false)
  const [packagesError, setPackagesError] = useState<string | null>(null)

  const [recipes, setRecipes] = useState<RecipeHighlight[]>([])
  const [recipesLoading, setRecipesLoading] = useState(false)
  const [recipesError, setRecipesError] = useState<string | null>(null)

  useEffect(() => {
    if (status === "loading") return

    if (session?.user) {
      switch (session.user.role) {
        case "CLIENT":
          router.push("/bilgilerim")
          return
        case "TRAINER":
          router.push("/egitmen")
          return
        case "ADMIN":
          router.push("/admin")
          return
      }
    }
  }, [router, session, status])

  useEffect(() => {
    if (status !== "unauthenticated") return

    let cancelled = false
    const controller = new AbortController()

    const loadPackages = async () => {
      try {
        setPackagesLoading(true)
        setPackagesError(null)

        const response = await fetch(`/api/packages?t=${Date.now()}`, {
          cache: "no-store",
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        })

        if (!response.ok) {
          throw new Error("Paketler getirilemedi")
        }

        const data = await response.json()
        if (cancelled) return

        const normalized: FitnessPackageSummary[] = Array.isArray(data?.packages)
          ? data.packages.map((pkg: any) => ({
              id: String(pkg.id),
              slug: typeof pkg.slug === "string" ? pkg.slug : null,
              name: typeof pkg.name === "string" ? pkg.name : "İsimsiz Paket",
              headline: typeof pkg.headline === "string" ? pkg.headline : null,
              description: typeof pkg.description === "string" ? pkg.description : null,
              price: Number(pkg.price) || 0,
              originalPrice: pkg.originalPrice != null ? Number(pkg.originalPrice) : null,
              currency: typeof pkg.currency === "string" ? pkg.currency : "TRY",
              durationInDays: Number(pkg.durationInDays) || 30,
              isPopular: Boolean(pkg.isPopular),
              themeColor: typeof pkg.themeColor === "string" ? pkg.themeColor : null,
              iconName: typeof pkg.iconName === "string" ? pkg.iconName : null,
              features: Array.isArray(pkg.features)
                ? pkg.features.filter((item: unknown) => typeof item === "string")
                : [],
            }))
          : []

        setPackages(normalized)
      } catch (error) {
        if (!cancelled) {
          console.error("Landing packages error:", error)
          setPackagesError("Paketler yüklenemedi. Lütfen daha sonra tekrar deneyin.")
        }
      } finally {
        if (!cancelled) {
          setPackagesLoading(false)
        }
      }
    }

    void loadPackages()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [status])

  useEffect(() => {
    if (status !== "unauthenticated") return

    let cancelled = false
    const controller = new AbortController()

    const loadRecipes = async () => {
      try {
        setRecipesLoading(true)
        setRecipesError(null)

        const response = await fetch("/api/static/recipes", {
          cache: "force-cache",
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error("Tarifler getirilemedi")
        }

        const data = await response.json()
        if (cancelled) return

        const normalized: RecipeHighlight[] = Array.isArray(data?.recipes)
          ? data.recipes.slice(0, 3).map((recipe: any) => ({
              id: String(recipe.id),
              name: typeof recipe.name === "string" ? recipe.name : "Tarif",
              category: typeof recipe.category === "string" ? recipe.category : "Genel",
              image: typeof recipe.image === "string" ? recipe.image : "/protein-pancakes-with-berries.png",
              rating: Number(recipe.rating) || 4.5,
              calories: Number(recipe.calories) || 0,
              protein: Number(recipe.protein) || 0,
              tags: Array.isArray(recipe.tags)
                ? recipe.tags.filter((item: unknown) => typeof item === "string").slice(0, 3)
                : [],
            }))
          : []

        setRecipes(normalized)
      } catch (error) {
        if (!cancelled) {
          console.error("Landing recipes error:", error)
          setRecipesError("Tarifler yüklenemedi. Lütfen daha sonra tekrar deneyin.")
        }
      } finally {
        if (!cancelled) {
          setRecipesLoading(false)
        }
      }
    }

    void loadRecipes()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [status])

  const featuredPackage = useMemo(() => {
    if (!packages.length) return null
    return packages.find((pkg) => pkg.isPopular) ?? packages[0]
  }, [packages])

  const cheapestPackage = useMemo(() => {
    if (!packages.length) return null
    return packages.reduce((previous, current) => {
      if (!previous) return current
      return current.price < previous.price ? current : previous
    })
  }, [packages])

  const handleSelectPackage = useCallback(
    (pkg: FitnessPackageSummary) => {
      const packageId = pkg.slug ?? pkg.id
      const params = new URLSearchParams()
      params.set("paket", packageId)
      params.set("kaynak", "landing")
      params.set("hedef", selectedGender)
      router.push(`/register?${params.toString()}`)
    },
    [router, selectedGender],
  )

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1D1E21] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-slate-400">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (session) {
    return null
  }

  return (
    <div className="bg-[#1D1E21] text-white">
      <header className="py-6">
        <TopNavigation />
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.1),transparent_65%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(29,30,33,0.98)_0%,rgba(29,30,33,0.92)_45%,rgba(29,30,33,0.65)_100%)]" />
          </div>
          <div className="relative z-10">
            <HeroSection
              featuredPackageName={featuredPackage?.name ?? "Online Koçluk"}
              cheapestPrice={
                cheapestPackage ? formatCurrency(cheapestPackage.price, cheapestPackage.currency) : "Hazırlanıyor"
              }
              selectedGender={selectedGender}
              onGenderChange={setSelectedGender}
            />
          </div>
        </section>

        <section className="relative overflow-hidden text-slate-900 pb-24 pt-24">
          <div className="absolute inset-0 bg-[#f1f2f5]" aria-hidden="true" />
          <div
            className="absolute inset-0 bg-[url('https://mehmetcanpt.com/wp-content/uploads/2025/02/funfact-bg.webp')] bg-cover bg-center"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(241,242,245,0.85),rgba(241,242,245,0.85))]" aria-hidden="true" />

          <div className="container relative z-10 mx-auto px-4">
            <div className="mb-6 flex flex-wrap items-center justify-center gap-2 text-sm font-medium text-emerald-600">
              <HeartPulse className="h-4 w-4 text-emerald-600" />
              Tüm paketlerimizde peşin fiyatına 3 taksit imkanı sunulmaktadır.
            </div>

            <div className="mb-6 flex justify-center">
              <TransformationGenderToggle
                selectedGender={selectedGender}
                onGenderChange={setSelectedGender}
              />
            </div>

            {packagesLoading ? (
              <div
                className={cn(
                  "mx-auto grid w-full max-w-7xl place-items-stretch gap-6",
                  "sm:grid-cols-2",
                  "lg:grid-cols-3",
                  packages.length >= 4 && "2xl:grid-cols-4",
                )}
              >
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={`package-skeleton-${index}`} className="h-[420px] rounded-3xl bg-slate-200" />
                ))}
              </div>
            ) : packagesError ? (
              <Card className="border border-rose-500/40 bg-rose-500/5 text-rose-700">
                <CardHeader>
                  <CardTitle>Paketler yüklenemedi</CardTitle>
                  <CardDescription className="text-rose-600">
                    {packagesError} Paketleri daha sonra tekrar yüklemeyi deneyebilirsiniz.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="border-rose-500/40 text-rose-600 hover:bg-rose-500/10">
                    <Link href="/paket-satin-al">Paketleri gör</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <PackageGrid
                packages={packages}
                featuredPackage={featuredPackage}
                onSelectPackage={handleSelectPackage}
              />
            )}
          </div>
        </section>

        <section id="ozellikler" className="bg-white py-24 text-slate-900">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="secondary" className="mb-4 bg-red-500/10 text-red-700">
                Paket Özellikleri
              </Badge>
              <h2 className="text-3xl font-semibold sm:text-4xl">Her pakette geçerli tüm avantajlar</h2>
              <p className="mt-3 text-lg text-slate-600">
                Programınızı ister 4 hafta ister 12 ay boyunca seçin, aşağıdaki tüm özelliklerden sınırsız şekilde
                yararlanırsınız.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {FEATURE_CATEGORIES.map((feature) => (
                <Card
                  key={feature.title}
                  className={cn(
                    "h-full border-2 shadow-sm transition hover:-translate-y-1 hover:shadow-lg",
                    feature.accentClass,
                  )}
                >
                  <CardHeader className="space-y-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/80 text-slate-900">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {feature.items.map((item) => (
                      <p key={item} className="flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        {item}
                      </p>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="beslenme" className="bg-[#202226] py-24 text-white">
          <div className="container mx-auto px-4">
            <div className="flex flex-col gap-12 lg:flex-row">
              <div className="flex-1 space-y-5 lg:sticky lg:top-8 lg:self-start">
                <Badge variant="outline" className="border-white/20 text-gray-200">
                  Beslenme + Tarifler
                </Badge>
                <h2 className="text-3xl font-semibold sm:text-4xl">
                  Yüksek proteinli tariflerle beslenmeni güçlendir
                </h2>
                <p className="text-lg text-slate-300">
                  Yoğun tempoda bile kolayca hazırlanabilen tarifler ile makro değerlerini dengede tut. Uzman ekip
                  tarafından oluşturulan tarif arşivi tüm paket sahiplerine açık.
                </p>
                <Button asChild size="lg" className="gap-2">
                  <Link href="/tarifler" className="flex items-center gap-2">
                    Tarifleri incele
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
              </div>
              <div className="flex-1">
                {recipesLoading ? (
                  <>
                    <div className="space-y-6 lg:hidden">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <Skeleton key={`recipe-skeleton-mobile-${index}`} className="h-48 rounded-2xl bg-white/10" />
                      ))}
                    </div>
                    <div className="relative hidden lg:block">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div
                          key={`recipe-skeleton-stack-${index}`}
                          className="sticky top-8 transition-transform duration-300 ease-out"
                          style={{
                            marginTop: index === 0 ? 0 : index * 56,
                            zIndex: 50 - index,
                          }}
                        >
                          <Skeleton className="h-56 rounded-3xl bg-white/10" />
                        </div>
                      ))}
                    </div>
                  </>
                ) : recipesError ? (
                  <Card className="border border-rose-500/40 bg-rose-500/10 backdrop-blur">
                    <CardHeader>
                      <CardTitle className="text-rose-100">Tarifler yüklenemedi</CardTitle>
                      <CardDescription className="text-rose-200/80">
                        {recipesError} Tarifleri daha sonra tekrar kontrol edebilirsiniz.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ) : recipes.length > 0 ? (
                  <>
                    <div className="space-y-6 lg:hidden">
                      {recipes.map((recipe) => (
                        <RecipeCard key={`recipe-mobile-${recipe.id}`} recipe={recipe} />
                      ))}
                    </div>
                    <div className="relative hidden lg:block">
                      {recipes.map((recipe, index) => (
                        <div
                          key={`recipe-stack-${recipe.id}`}
                          className={cn(
                            "sticky top-8 transition-transform duration-300 ease-out",
                            index !== 0 && "hover:-translate-y-2",
                          )}
                          style={{
                            marginTop: index === 0 ? 0 : index * 64,
                            zIndex: 10 + index,
                          }}
                        >
                          <RecipeCard
                            recipe={recipe}
                            accent={index === recipes.length - 1}
                            compact={index !== recipes.length - 1}
                            className={cn(
                              "rounded-3xl transition-shadow duration-300",
                              index === recipes.length - 1
                                ? "shadow-[0_25px_70px_rgba(15,23,42,0.45)]"
                                : "shadow-[0_25px_50px_rgba(15,23,42,0.3)]",
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <Card className="border border-white/10 bg-[rgba(12,27,62,0.85)] text-sm text-slate-200">
                    <CardHeader>
                      <CardTitle className="text-white">Tarifler hazırlanıyor</CardTitle>
                      <CardDescription className="text-slate-300">
                        Başlangıç için en sevdiğimiz tarifleri güncelliyoruz. Güncellemeler için takipte kalın.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#fef3f2] py-20 text-slate-900">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.22),transparent_60%)]" aria-hidden="true" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,153,153,0.25),transparent_65%)]" aria-hidden="true" />
          <div className="container relative z-10 mx-auto px-4">
            <Card className="border-white/40 bg-[linear-gradient(120deg,rgba(255,255,255,0.85),rgba(255,228,231,0.75))] text-slate-900 shadow-xl">
              <CardContent className="grid gap-8 p-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
                <div className="space-y-4">
                  <Badge variant="secondary" className="bg-red-500/15 text-red-700">
                    Değişime hemen başla
                  </Badge>
                  <h2 className="text-3xl font-semibold sm:text-4xl">
                    Kişisel koçluğunu seç, haftalık ilerlemeni birlikte takip edelim
                  </h2>
                  <p className="text-lg text-slate-600">
                    Paketi seçtiğinde önce hesabını oluştur, ardından seni ödeme sayfasına yönlendirelim. Seçtiğin paket
                    otomatik olarak kaydedilecek.
                  </p>
                </div>
                <div className="space-y-3 rounded-2xl bg-white/70 p-6 text-sm text-slate-700 shadow-inner">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-500" />
                    Kişisel antrenman + beslenme kombinasyonu
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-500" />
                    Eğitmenle sınırsız mesajlaşma ve raporlama
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-500" />
                    Peşin fiyatına taksit seçeneği
                  </div>
                  <Button asChild size="lg" className="w-full bg-red-600 hover:bg-red-600/90 text-white">
                    <Link href="#paketler">Paketleri incele</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#1D1E21] py-10 text-sm text-gray-300">
        <div className="container mx-auto flex flex-col gap-4 px-4 text-center md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Mehmetcanpt Uzaktan Eğitim. Tüm hakları saklıdır.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/paket-satin-al" className="hover:text-white">
              Paket Seçimi
            </Link>
            <Link href="/soru-merkezi" className="hover:text-white">
              Sık Sorulan Sorular
            </Link>
            <Link href="/iletisim" className="hover:text-white">
              İletişim
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function TopNavigation() {
  return (
    <div className="container mx-auto px-4">
      <div className="flex h-16 items-center justify-between rounded-2xl border border-white/10 bg-[rgba(29,30,33,0.85)] px-4 lg:px-6 backdrop-blur">
        <Link href="/" className="flex items-center gap-3 text-sm font-semibold tracking-tight text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/80">
            <Dumbbell className="h-5 w-5" />
          </span>
          <div className="flex items-center gap-2">
            <span className="text-lg">Mehmetcanpt Uzaktan Eğitim</span>
            <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded font-medium">BETA</span>
          </div>
        </Link>
        <div className="hidden items-center gap-4 text-sm text-gray-300 md:flex">
          <Link href="#paketler" className="transition hover:text-white">
            Uzaktan Eğitim Paketleri
          </Link>
          <Link href="#ozellikler" className="transition hover:text-white">
            Paket Özellikleri
          </Link>
          <Link href="#beslenme" className="transition hover:text-white">
            Beslenme Rehberi
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex text-gray-300 hover:text-white">
            <Link href="/login">Giriş Yap</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register" className="flex items-center gap-2">
              Ücretsiz Kayıt Ol
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

function HeroSection({
  featuredPackageName,
  cheapestPrice,
  selectedGender,
  onGenderChange,
}: {
  featuredPackageName: string
  cheapestPrice: string
  selectedGender: GenderFilter
  onGenderChange: (gender: GenderFilter) => void
}) {
  return (
    <section className="container mx-auto px-4 pb-28 pt-20 lg:pb-36">
      <div className="flex flex-col items-center gap-16 lg:flex-row lg:items-center lg:justify-between">
        <div className="w-full max-w-3xl space-y-6 text-left lg:space-y-8">
          <Badge variant="outline" className="border-white/25 text-gray-200">
            Uzaktan Eğitim Paketleri
          </Badge>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Saat kaç olursa olsun, kişisel koçun hazır!
            </h1>
            <p className="text-lg text-slate-200 lg:text-xl">
              Kişisel hedeflerine göre planlanan antrenman ve beslenme programlarıyla değişime hemen başla.{" "}
              <span className="font-semibold text-white">{featuredPackageName}</span> paketi şu anda en çok tercih edilen
              programımız.
            </p>
          </div>

          <SocialProofHighlight />

          <div className="mt-8 flex flex-wrap gap-4">
            <Button asChild size="lg">
              <Link href="#paketler" className="flex items-center gap-2">
                Değişime Başla
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white/20 bg-white/10 text-gray-200 hover:bg-white/15"
            >
              <Link href="/paket-satin-al">Detaylı Paket İncelemesi</Link>
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm text-slate-300">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-300" />
              En uygun paket {cheapestPrice}ʼden başlıyor
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-300" />
              Uzman eğitmen kadrosu
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-300" />
              4.9/5 memnuniyet skoru
            </div>
          </div>
        </div>

        <div className="w-full max-w-[580px] sm:max-w-[600px]">
          <PhoneShowcaseSlider />
        </div>
      </div>
    </section>
  )
}

function PhoneShowcaseSlider() {
  const slides = useMemo<PhoneShowcaseSlide[]>(
    () => [
      {
        id: "progress",
        label: "Gelişim Süreci",
        description: "Haftalık ölçümlerini, kilo değişimini ve eğitmenin paylaştığı notları tek ekranda takip et.",
        screenSrc: "/hero-slider/screen-progress.png",
      },
      {
        id: "supplement",
        label: "Beslenme Planlaması",
        description: "Hedeflerine uygun beslenme planını kullanım zamanlarına göre düzenli hatırlatmalarla gör.",
        screenSrc: "/hero-slider/screen-supplement.png",
      },
      {
        id: "routines",
        label: "Rutinler ve Egzersizler",
        description: "Isınmadan ana egzersizlere kadar tüm program akışını seviyene göre düzenlenmiş şekilde incele.",
        screenSrc: "/hero-slider/screen-routines.png",
      },
      {
        id: "workout",
        label: "Video Antrenman",
        description: "Doğru form için hareket videolarını izle, tekrar sayılarını ve dinlenme sürelerini uygula.",
        screenSrc: "/hero-slider/screen-workout.png",
      },
      {
        id: "recipes",
        label: "Tarifler ve Makrolar",
        description: "Günlük hedeflerine göre hazırlanmış tarifleri öğren, makro değerlerini tek bakışta gör.",
        screenSrc: "/hero-slider/screen-recipes.png",
      },
    ],
    [],
  )

  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((previous) => (previous + 1) % slides.length)
    }, 4500)

    return () => {
      window.clearInterval(timer)
    }
  }, [slides.length])

  const goToSlide = useCallback(
    (index: number) => {
      setActiveIndex((index + slides.length) % slides.length)
    },
    [slides.length],
  )

  const previous = useCallback(() => {
    goToSlide(activeIndex - 1)
  }, [activeIndex, goToSlide])

  const next = useCallback(() => {
    goToSlide(activeIndex + 1)
  }, [activeIndex, goToSlide])

  const activeSlide = slides[activeIndex]

  return (
    <div className="relative mx-auto flex w-full flex-col items-center">
      <div className="absolute -top-28 bottom-10 left-1/2 -z-10 aspect-square w-[580px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.04)_60%,transparent_100%)] blur-xl lg:-top-32 lg:w-[680px]" />
      <div className="relative w-full max-w-[560px] sm:max-w-[580px] lg:max-w-[600px]">
        <div className="relative aspect-[570/815]">
          <div className="absolute left-[22.5%] right-[22.5%] top-[6.5%] bottom-[7.5%] overflow-hidden rounded-[38px] bg-slate-950/80 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
            <div
              className="flex h-full w-full transition-transform duration-700 ease-out"
              style={{ transform: `translateX(-${activeIndex * 100}%)` }}
            >
              {slides.map((slide) => (
                <div key={slide.id} className="relative h-full w-full shrink-0">
                  <Image
                    src={slide.screenSrc}
                    alt={slide.label}
                    fill
                    priority={slide.id === activeSlide.id}
                    className="object-contain"
                  />
                </div>
              ))}
            </div>
          </div>

          <Image
            src="/hero-slider/phone-frame.png"
            alt="Mobil uygulama önizlemesi"
            fill
            priority
            className="pointer-events-none select-none"
          />
        </div>

        <div className="pointer-events-none absolute inset-x-10 -bottom-8 h-24 rounded-full bg-gradient-to-b from-white/10 to-transparent blur-3xl" />

        <div className="absolute inset-x-0 -bottom-7 flex justify-between px-6 text-white/70">
          <button
            type="button"
            onClick={previous}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 text-sm transition hover:bg-white/10"
            aria-label="Önceki ekran"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={next}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 text-sm transition hover:bg-white/10"
            aria-label="Sonraki ekran"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-12 flex items-center gap-3">
        {slides.map((slide, index) => {
          const isActive = index === activeIndex
          return (
            <button
              key={slide.id}
              type="button"
              onClick={() => goToSlide(index)}
              className={cn(
                "h-2 rounded-full transition-all",
                isActive ? "w-8 bg-white" : "w-3 bg-white/30 hover:bg-white/50",
              )}
              aria-label={`${slide.label} ekranını göster`}
            />
          )
        })}
      </div>

      <div className="mt-6 max-w-sm text-center text-sm text-slate-300">
        <p className="text-base font-semibold text-white">{activeSlide.label}</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-300/90">{activeSlide.description}</p>
      </div>
    </div>
  )
}

function SocialProofHighlight() {
  const userAvatars = [
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop&crop=faces",
    "https://images.unsplash.com/photo-1594381898411-846e7d193883?w=200&h=200&fit=crop&crop=faces",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces",
  ]

  return (
    <div className="inline-flex flex-col md:flex-row items-center gap-4 rounded-3xl border border-white/10 bg-white/5 px-4 py-4 shadow-lg">
      <div className="flex items-center gap-4">
        <div className="flex items-center -space-x-3">
          {userAvatars.map((avatar, index) => (
            <div
              key={`transformation-avatar-${index}`}
              className="relative flex h-16 w-12 items-center justify-center rounded-xl border-2 border-white/20 bg-[linear-gradient(135deg,#2d2e34,#1e1f23)] shadow-inner overflow-hidden"
              style={{ zIndex: userAvatars.length - index }}
            >
              <Image
                src={avatar}
                alt={`Kullanıcı ${index + 1}`}
                fill
                className="object-cover"
              />
            </div>
          ))}
        </div>
        <div className="flex h-16 min-w-[72px] items-center justify-center rounded-2xl bg-red-600 px-4 text-lg font-semibold text-white shadow-lg">
          1500+
        </div>
      </div>
      <p className="text-left text-xs leading-relaxed text-gray-200 max-w-xs md:max-w-xs">
        Dönüşüm hikayelerinden ilham al, sen de kendi hedefini gerçekleştiren 1500+ danışana katıl.
      </p>
    </div>
  )
}

function TransformationGenderToggle({
  selectedGender,
  onGenderChange,
  className,
}: {
  selectedGender: GenderFilter
  onGenderChange: (gender: GenderFilter) => void
  className?: string
}) {
  return (
    <div
      className={cn(
        "inline-flex w-full max-w-xs items-center gap-2 rounded-full border border-slate-300 bg-white/80 p-1 text-sm font-semibold text-slate-700 shadow-sm",
        className,
      )}
    >
      {[
        { label: "Kadın", value: "female" as const },
        { label: "Erkek", value: "male" as const },
      ].map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onGenderChange(option.value)}
          className={cn(
            "flex-1 rounded-full px-5 py-2 transition",
            selectedGender === option.value
              ? "bg-slate-900 text-white shadow"
              : "text-slate-500 hover:text-slate-700",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function PackageGrid({
  packages,
  featuredPackage,
  onSelectPackage,
}: {
  packages: FitnessPackageSummary[]
  featuredPackage: FitnessPackageSummary | null
  onSelectPackage: (pkg: FitnessPackageSummary) => void
}) {
  if (!packages.length) {
    return (
      <Card className="border border-slate-200 bg-white text-center">
        <CardHeader>
          <CardTitle>Yeni paketler hazırlanıyor</CardTitle>
          <CardDescription className="text-slate-600">
            Ekibimiz yeni paket seçenekleri üzerinde çalışıyor. Güncellemeler için hesabınızı oluşturun.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/register">Bilgilendirme listesine katıl</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const sorted = [...packages].sort((a, b) => a.price - b.price)

  return (
    <div
      id="paketler"
      className={cn(
        "mx-auto grid w-full max-w-7xl place-items-stretch gap-6",
        "sm:grid-cols-2",
        "lg:grid-cols-3",
        packages.length >= 4 && "2xl:grid-cols-4",
      )}
    >
      {sorted.map((pkg) => {
        const Icon =
          (pkg.iconName && PACKAGE_ICON_MAP[pkg.iconName.toLowerCase()]) || PACKAGE_ICON_MAP.dumbbell
        const isFeatured = featuredPackage?.id === pkg.id

        return (
          <Card
            key={pkg.id}
            className={cn(
              "relative flex h-full flex-col justify-between rounded-3xl border-2 bg-white shadow-lg transition-all",
              isFeatured
                ? "border-emerald-500/50 shadow-emerald-200/40"
                : "border-slate-200 hover:-translate-y-1 hover:shadow-xl",
            )}
          >
            {isFeatured && (
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-4 py-1 text-xs font-semibold text-white shadow-lg">
                En çok tercih edilen
              </span>
            )}
            <CardHeader className="space-y-4 pb-4 text-center">
              <CardTitle className="text-2xl font-semibold text-slate-900">{pkg.name}</CardTitle>
              {pkg.headline && <CardDescription className="text-base text-slate-600">{pkg.headline}</CardDescription>}
              <div className="space-y-1 text-slate-900">
                <p className="text-4xl font-bold">{formatCurrency(pkg.price, pkg.currency)}</p>
                {pkg.originalPrice && (
                  <p className="text-sm text-slate-500 line-through">
                    {formatCurrency(pkg.originalPrice, pkg.currency)}
                  </p>
                )}
                <p className="text-sm text-slate-500">{Math.round(pkg.durationInDays / 7)} haftalık program</p>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-6 text-sm text-slate-700">
              <ul className="space-y-2 text-left">
                {pkg.features.slice(0, 5).map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-emerald-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => onSelectPackage(pkg)}
                size="lg"
                className={cn("w-full text-base font-semibold shadow-md", isFeatured ? "" : "bg-neutral-900")}
              >
                Hemen Başla
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function RecipeCard({
  recipe,
  className,
  accent = false,
  compact = false,
}: {
  recipe: RecipeHighlight
  className?: string
  accent?: boolean
  compact?: boolean
}) {
  return (
    <Card
      className={cn(
        "flex h-full flex-col overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(45,46,52,0.95),rgba(24,25,28,0.9))] backdrop-blur transition-colors !p-0",
        accent && "border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(31,32,38,0.95))]",
        className,
      )}
    >
      <div
        className={cn(
          "w-full bg-cover bg-center",
          compact ? "h-40" : "h-48 lg:h-56",
        )}
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0) 30%, rgba(15,23,42,0.85) 100%), url(${recipe.image})`,
        }}
      />
      <CardHeader className={cn("space-y-3 pt-2", compact ? "pb-4" : "")}>
        <Badge
          variant="outline"
          className={cn(
            "border-white/15 bg-white/10 text-gray-100",
            accent && "border-white/20 bg-white/15 text-white",
          )}
        >
          {recipe.category}
        </Badge>
        <CardTitle className={cn("text-white", compact ? "text-lg" : "text-xl")}>{recipe.name}</CardTitle>
        <CardDescription className="text-slate-200">
          Dengeli bir öğün için {recipe.protein}g protein ve {recipe.calories} kalori.
        </CardDescription>
      </CardHeader>
      <CardContent className={cn("mt-auto space-y-4 pb-6 sm:pb-4", compact ? "pb-6" : "")}>
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-100">
          <span className="flex items-center gap-1 text-amber-300">
            <Star className="h-4 w-4" />
            {recipe.rating.toFixed(1)}
          </span>
          <span className="flex items-center gap-1">
            <Flame className="h-4 w-4 text-red-300" />
            {recipe.calories} kcal
          </span>
          <span className="flex items-center gap-1">
            <Activity className="h-4 w-4 text-emerald-300" />
            {recipe.protein}g protein
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {recipe.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="border-white/10 bg-white/10 text-gray-100">
              #{tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
