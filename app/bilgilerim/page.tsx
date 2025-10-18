"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import ResponsiveLayout from "@/components/responsive-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"
import {
  User,
  Edit3,
  Save,
  Ruler,
  Target,
  Activity,
  Phone,
  LogOut,
  ChevronDown,
  ChevronUp,
  CreditCard,
  CalendarDays,
  CalendarCheck,
  Clock,
  Zap,
  Star,
  Crown,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { signOut } from "next-auth/react"
import Image from "next/image"
import { toast } from "@/components/ui/use-toast"

type ActivePackageSummary = {
  id: string
  status: string
  purchasedAt: string
  startsAt: string
  expiresAt: string
  remainingDays: number
  package: {
    id: string
    slug: string
    name: string
    headline?: string | null
    description?: string | null
    price: number
    originalPrice?: number | null
    currency: string
    durationInDays: number
    themeColor?: string | null
    iconName?: string | null
    features: string[]
    notIncluded?: string[]
  }
}

const emitProfileUpdate = (payload: { name?: string; email?: string; avatar?: string | null }) => {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent("user-profile-updated", { detail: payload }))
}

export default function BilgilerimPage() {
  const [isEditing, setIsEditing] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isBMIOpen, setIsBMIOpen] = useState(false)
  const [activePackage, setActivePackage] = useState<ActivePackageSummary | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "",
    height: "",
    weight: "",
    targetWeight: "75",
    activityLevel: "Orta",
    goal: "Kilo Verme",
    phone: "",
    email: "",
    avatar: "/fitness-user-avatar.png"
  })

  useEffect(() => {
    let isMounted = true

    const fetchUserProfile = async () => {
      try {
        setIsInitialLoading(true)
        const [profileResponse, subscriptionResponse] = await Promise.all([
          fetch("/api/user/profile", { cache: "no-store" }),
          fetch("/api/user/subscription", { cache: "no-store" }),
        ])

        if (!profileResponse.ok) {
          throw new Error("Profil bilgileri getirilemedi")
        }

        const profileData = await profileResponse.json()

        if (isMounted) {
          setFormData(profileData)
          emitProfileUpdate({ name: profileData.name, email: profileData.email, avatar: profileData.avatar })
        }

        if (isMounted) {
          if (subscriptionResponse.ok) {
            const subscriptionData = await subscriptionResponse.json()
            setActivePackage(subscriptionData.activePackage ?? null)
          } else {
            setActivePackage(null)
          }
        }
      } catch (error) {
        if (isMounted) {
          toast({
            title: "Hata",
            description: "Profil bilgileri yüklenemedi",
            variant: "destructive",
          })
        }
      } finally {
        if (isMounted) {
          setIsInitialLoading(false)
        }
      }
    }

    void fetchUserProfile()

    return () => {
      isMounted = false
    }
  }, [])

  const handleSignOut = () => {
    signOut({
      callbackUrl: '/login',
      redirect: true
    })
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error('Profil güncellenemedi')
      }

      toast({
        title: "Başarılı",
        description: "Profil bilgileriniz güncellendi",
        variant: "default"
      })

      setIsEditing(false)
      emitProfileUpdate({ name: formData.name, email: formData.email, avatar: formData.avatar })
    } catch (error) {
      toast({
        title: "Hata",
        description: "Profil güncellenirken bir sorun oluştu",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setIsUploadingAvatar(true)
      
      const formData = new FormData()
      formData.append('avatar', file)

      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Avatar yüklenemedi')
      }

      const data = await response.json()
      setFormData((prev) => {
        const next = { ...prev, avatar: data.avatarUrl }
        emitProfileUpdate({ name: next.name, email: next.email, avatar: next.avatar })
        return next
      })

      toast({
        title: "Başarılı",
        description: "Profil fotoğrafınız güncellendi",
        variant: "default"
      })
    } catch (error) {
      toast({
        title: "Hata",
        description: "Profil fotoğrafı yüklenirken bir sorun oluştu",
        variant: "destructive"
      })
    } finally {
      setIsUploadingAvatar(false)
      // Input'u temizle
      event.target.value = ''
    }
  }

  const calculateBMI = () => {
    const height = Number.parseFloat(formData.height) / 100
    const weight = Number.parseFloat(formData.weight)
    return isNaN(height) || isNaN(weight) ? "0.0" : (weight / (height * height)).toFixed(1)
  }

  const getBMICategory = () => {
    const bmi = Number.parseFloat(calculateBMI())
    if (isNaN(bmi) || bmi === 0) return { category: "Hesaplanamıyor", color: "text-gray-600", bgColor: "bg-gray-50", borderColor: "border-gray-200", info: "Boy ve kilo bilgilerini giriniz." }

    if (bmi < 18.5) {
      return {
        category: "Zayıf",
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        info: "Vücut kitle indeksiniz düşük. Sağlıklı bir kiloya ulaşmak için beslenme uzmanına danışınız."
      }
    } else if (bmi >= 18.5 && bmi < 25) {
      return {
        category: "Normal",
        color: "text-green-600",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        info: "Vücut kitle indeksiniz normal aralıkta. Sağlıklı yaşam tarzınızı sürdürünüz."
      }
    } else if (bmi >= 25 && bmi < 30) {
      return {
        category: "Fazla Kilolu",
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-200",
        info: "Vücut kitle indeksiniz yüksek. Düzenli egzersiz ve beslenme düzeni ile sağlıklı kiloya ulaşabilirsiniz."
      }
    } else if (bmi >= 30 && bmi < 35) {
      return {
        category: "Obez (Derece 1)",
        color: "text-orange-600",
        bgColor: "bg-orange-50",
        borderColor: "border-orange-200",
        info: "Vücut kitle indeksiniz obezite aralığında. Sağlık uzmanına danışarak kilo verme programı uygulayınız."
      }
    } else if (bmi >= 35 && bmi < 40) {
      return {
        category: "Obez (Derece 2)",
        color: "text-red-600",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        info: "Vücut kitle indeksiniz ciddi obezite aralığında. Acilen sağlık uzmanına başvurunuz."
      }
    } else {
      return {
        category: "Aşırı Obez",
        color: "text-red-700",
        bgColor: "bg-red-50",
        borderColor: "border-red-300",
        info: "Vücut kitle indeksiniz aşırı obezite aralığında. Derhal tıbbi yardım alın."
      }
    }
  }

  const calculateDailyCalories = () => {
    const weight = Number.parseFloat(formData.weight)
    const height = Number.parseFloat(formData.height)
    const age = Number.parseFloat(formData.age)

    const bmr = 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age

    const activityMultiplier = {
      Düşük: 1.2,
      Orta: 1.55,
      Yüksek: 1.725,
    }

    return Math.round(bmr * (activityMultiplier[formData.activityLevel as keyof typeof activityMultiplier] || 1.55))
  }

  const packageIconMap: Record<string, LucideIcon> = {
    zap: Zap,
    star: Star,
    crown: Crown,
  }

  const packageIconKey = (activePackage?.package.iconName ?? "").toLowerCase()
  const PackageIcon = packageIconMap[packageIconKey] ?? CreditCard
  const themeColorClass = activePackage?.package.themeColor ?? "bg-primary"

  const formatCurrency = (value: number, currency: string = "TRY") => {
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

  const formatDate = (value: string) => {
    try {
      return new Date(value).toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    } catch (_error) {
      return "-"
    }
  }

  if (isInitialLoading) {
    return (
      <ResponsiveLayout>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24 rounded-md" />
              <Skeleton className="h-10 w-28 rounded-md" />
            </div>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row items-center gap-6">
                <Skeleton className="h-28 w-28 rounded-full" />
                <div className="flex-1 space-y-3 w-full">
                  <Skeleton className="h-6 w-48" />
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-24 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-44" />
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-48" />
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="space-y-3">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-36" />
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 lg:grid-cols-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="space-y-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                ))}
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Skeleton className="h-28 w-full rounded-lg" />
                <Skeleton className="h-28 w-full rounded-lg" />
              </div>
            </CardContent>
          </Card>
        </div>
      </ResponsiveLayout>
    )
  }

  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Bilgilerim</h1>
              <p className="text-muted-foreground">Kişisel bilgilerini yönet</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant={isEditing ? "destructive" : "outline"}
              onClick={() => {
                if (isEditing) {
                  handleSave();
                } else {
                  setIsEditing(true);
                }
              }}
              disabled={isSaving}
            >
              {isEditing ? <Save className="w-4 h-4 mr-2" /> : <Edit3 className="w-4 h-4 mr-2" />}
              {isEditing ? "Kaydet" : "Düzenle"}
            </Button>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Çıkış Yap
            </Button>
          </div>
        </div>

        {/* Subscription Summary */}
        <Card className={activePackage ? "border border-primary/30 bg-primary/5" : "border-dashed border-primary/50"}>
          {activePackage ? (
            <>
              <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full text-white ${themeColorClass}`}>
                    <PackageIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-foreground">{activePackage.package.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {activePackage.package.headline ?? "Aktif fitness paketiniz"}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="border border-primary/20 bg-primary/10 text-primary">
                  {activePackage.remainingDays} gün kaldı
                </Badge>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-4">
                <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background px-4 py-3">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Paket Ücreti</p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(activePackage.package.price, activePackage.package.currency)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background px-4 py-3">
                  <CalendarCheck className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Satın Alma</p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatDate(activePackage.purchasedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background px-4 py-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Süre</p>
                    <p className="text-sm font-semibold text-foreground">
                      {activePackage.package.durationInDays} gün
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background px-4 py-3">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Bitiş Tarihi</p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatDate(activePackage.expiresAt)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-lg text-foreground">Aktif paket bulunmuyor</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Antrenman, beslenme ve gelişim içeriklerine erişmek için paket satın almalısın.
                  </p>
                </div>
                <Button asChild>
                  <Link href="/paket-satin-al">Paketleri İncele</Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 text-sm text-muted-foreground">
                  <span>• Satın alma sonrasında tüm içerikler kilidi açılır.</span>
                  <span>• Paketler ile kişiselleştirilmiş programlara ulaşabilirsin.</span>
                </div>
              </CardContent>
            </>
          )}
        </Card>

        {/* Profile Photo & Basic Info */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row items-center gap-6">
              <div className="relative">
                <Image
                  src={formData.avatar}
                  alt="Profil Fotoğrafı"
                  width={120}
                  height={120}
                  className="rounded-full border-4 border-primary/20"
                />
                {isEditing && (
                  <div className="absolute bottom-0 right-0">
                    <label htmlFor="avatar-upload" className="cursor-pointer">
                      <div className="bg-primary hover:bg-primary/90 text-white rounded-full w-8 h-8 flex items-center justify-center transition-all duration-200">
                        {isUploadingAvatar ? (
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                          <Edit3 className="w-4 h-4" />
                        )}
                      </div>
                    </label>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={isUploadingAvatar}
                    />
                  </div>
                )}
              </div>
              <div className="flex-1 text-center lg:text-left">
                <h2 className="text-2xl font-bold text-foreground mb-2">{formData.name}</h2>
                <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                  <Badge variant="secondary">{formData.age} yaşında</Badge>
                  <Badge variant="secondary">{formData.gender}</Badge>
                  <Badge variant="secondary">{formData.goal}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Kişisel Bilgiler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Ad Soyad</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="age">Yaş</Label>
                <Input
                  id="age"
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="gender">Cinsiyet</Label>
                <Input
                  id="gender"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="activityLevel">Aktivite Seviyesi</Label>
                {isEditing ? (
                  <Select
                    value={formData.activityLevel}
                    onValueChange={(value) => setFormData({ ...formData, activityLevel: value })}
                    disabled={!isEditing}
                  >
                    <SelectTrigger id="activityLevel">
                      <SelectValue placeholder="Aktivite seviyesi seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Düşük">Düşük (Az veya hiç egzersiz yapmıyorum)</SelectItem>
                      <SelectItem value="Orta">Orta (Haftada 1-3 gün egzersiz yapıyorum)</SelectItem>
                      <SelectItem value="Yüksek">Yüksek (Haftada 4+ gün egzersiz yapıyorum)</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="activityLevel"
                    value={formData.activityLevel}
                    disabled={true}
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Physical Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ruler className="w-5 h-5" />
              Fiziksel Özellikler
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="height">Boy (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="weight">Kilo (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="targetWeight">Hedef Kilo (kg)</Label>
                <Input
                  id="targetWeight"
                  type="number"
                  value={formData.targetWeight}
                  onChange={(e) => setFormData({ ...formData, targetWeight: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
            </div>

            {/* Health Indicators */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
              <Collapsible open={isBMIOpen} onOpenChange={setIsBMIOpen}>
                <Card className={`${getBMICategory().bgColor} ${getBMICategory().borderColor}`}>
                  <CollapsibleTrigger asChild>
                    <CardContent className="p-4 text-center cursor-pointer hover:opacity-80 transition-opacity">
                      <div className="flex items-center justify-center mb-2">
                        <Activity className="w-8 h-8 text-current mr-2" />
                        {isBMIOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                      <p className={`text-sm font-medium ${getBMICategory().color}`}>BMI</p>
                      <p className={`text-2xl font-bold ${getBMICategory().color}`}>{calculateBMI()}</p>
                      <p className={`text-xs ${getBMICategory().color}`}>{getBMICategory().category}</p>
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4">
                      <p className={`text-sm ${getBMICategory().color} text-center`}>
                        {getBMICategory().info}
                      </p>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4 text-center">
                  <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-green-600 font-medium">Günlük Kalori</p>
                  <p className="text-2xl font-bold text-green-700">{calculateDailyCalories()}</p>
                  <p className="text-xs text-green-600">Hedef İhtiyaç</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              İletişim Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="email">E-posta</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={true} // Email değiştirilemesin
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Goals Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Hedef İlerlemen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Kilo Hedefi</span>
                <span className="text-sm text-muted-foreground">
                  {formData.weight}kg → {formData.targetWeight}kg
                </span>
              </div>
              <Progress value={70} className="h-3" />
              <p className="text-xs text-muted-foreground">
                Hedefine {Number.parseFloat(formData.weight) - Number.parseFloat(formData.targetWeight)} kg kaldı
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Antrenman Sıklığı</span>
                <span className="text-sm text-muted-foreground">3 gün/hafta → 5 gün/hafta</span>
              </div>
              <Progress value={60} className="h-3" />
              <p className="text-xs text-muted-foreground">
                Hedefine 2 gün kaldı
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        {isEditing && (
          <div className="flex justify-end">
            <Button onClick={handleSave} className="px-8" disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              Değişiklikleri Kaydet
            </Button>
          </div>
        )}
      </div>
    </ResponsiveLayout>
  )
}
