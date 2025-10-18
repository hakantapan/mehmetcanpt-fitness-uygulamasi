"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import ResponsiveLayout from "@/components/responsive-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { toast } from "@/components/ui/use-toast"

type PurchaseResponse = {
  purchase: {
    id: string
    status: string
    startsAt: string
    expiresAt: string
    remainingDays: number
    package: {
      id: string
      name: string
      price: number
      currency: string
      durationInDays: number
    }
  }
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

export default function PaytrResultPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const status = (searchParams?.get("status") ?? "").toLowerCase()
  const merchantOid = searchParams?.get("merchant_oid") ?? searchParams?.get("merchantOid") ?? null

  const [completionState, setCompletionState] = useState<"idle" | "loading" | "success" | "error" | "skipped">("idle")
  const [completionError, setCompletionError] = useState<string | null>(null)
  const [purchase, setPurchase] = useState<PurchaseResponse["purchase"] | null>(null)

  useEffect(() => {
    if (status !== "success" || !merchantOid) {
      setCompletionState("skipped")
      return
    }

    const finalize = async () => {
      try {
        setCompletionState("loading")
        setCompletionError(null)

        const response = await fetch("/api/paytr/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ merchantOid }),
        })

        if (response.status === 401) {
          router.push(`/login?callbackUrl=${encodeURIComponent(`/paket-satin-al/odeme-sonucu?merchant_oid=${merchantOid}`)}`)
          return
        }

        if (!response.ok) {
          const data = await response.json().catch(() => null)
          throw new Error(data?.error || "Ödeme tamamlanamadı")
        }

        const data = (await response.json()) as PurchaseResponse
        setPurchase(data.purchase)
        setCompletionState("success")
      } catch (error) {
        console.error("PayTR completion error:", error)
        setCompletionState("error")
        setCompletionError(error instanceof Error ? error.message : "Ödeme tamamlanamadı")
      }
    }

    void finalize()
  }, [merchantOid, router, status])

  useEffect(() => {
    if (status === "failed") {
      toast({
        title: "Ödeme tamamlanamadı",
        description: "Ödeme işlemi iptal edildi. Dilerseniz tekrar deneyebilirsiniz.",
        variant: "destructive",
      })
    }
  }, [status])

  const renderContent = () => {
    if (status === "failed") {
      return (
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="space-y-2 text-center">
            <Badge variant="destructive" className="mx-auto px-3 py-1">Ödeme başarısız</Badge>
            <CardTitle className="text-2xl text-foreground">Ödeme tamamlanamadı</CardTitle>
            <CardDescription>
              İşleminiz iptal edildi veya ödeme sırasında bir sorun oluştu. Lütfen kart bilgilerinizi kontrol ederek
              tekrar deneyin.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Önerilen Adımlar</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  <li>Kart limitinizi ve internet alışverişine açık olduğunu kontrol edin.</li>
                  <li>Farklı bir kart ile tekrar deneyin.</li>
                  <li>Destek ekibimizle iletişime geçerek yardım isteyin.</li>
                </ul>
              </AlertDescription>
            </Alert>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button variant="outline" onClick={() => router.push("/paket-satin-al")} className="gap-2">
                Paketi tekrar seç
              </Button>
              <Button onClick={() => router.push("/destek")} className="gap-2">
                Destek ile iletişime geç
              </Button>
            </div>
          </CardContent>
        </Card>
      )
    }

    if (status === "success") {
      if (completionState === "loading") {
        return (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            Ödeme doğrulanıyor, lütfen bekleyiniz...
          </div>
        )
      }

      if (completionState === "error") {
        return (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl text-foreground">Ödeme doğrulanamadı</CardTitle>
              <CardDescription>
                Ödeme işleminiz tamamlandı ancak paket aktivasyonu sırasında sorun oluştu. Lütfen tekrar deneyin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Hata ayrıntısı</AlertTitle>
                <AlertDescription>{completionError ?? "Bilinmeyen bir hata oluştu."}</AlertDescription>
              </Alert>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button onClick={() => window.location.reload()} className="gap-2">
                  Tekrar Dene
                </Button>
                <Button variant="outline" onClick={() => router.push("/paket-satin-al")} className="gap-2">
                  Paket seçimine dön
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      }

      if (completionState === "success" && purchase) {
        return (
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="space-y-2 text-center">
              <Badge className="mx-auto bg-emerald-500 text-white px-3 py-1">Ödeme başarılı</Badge>
              <CardTitle className="flex flex-col items-center gap-2 text-2xl text-foreground">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                Paketiniz aktifleştirildi!
              </CardTitle>
              <CardDescription>
                {purchase.package.name} paketiniz başarıyla aktif edildi. Artık premium içeriklere erişebilirsiniz.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Paket</p>
                  <p className="text-base font-semibold text-foreground">{purchase.package.name}</p>
                  <p>
                    {formatCurrency(purchase.package.price, purchase.package.currency)} ·{" "}
                    {purchase.package.durationInDays % 30 === 0
                      ? `${Math.max(1, Math.round(purchase.package.durationInDays / 30))} Ay`
                      : `${purchase.package.durationInDays} Gün`}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Geçerlilik</p>
                  <p className="text-base font-semibold text-foreground">
                    {format(new Date(purchase.startsAt), "dd MMM yyyy", { locale: tr })} -{" "}
                    {format(new Date(purchase.expiresAt), "dd MMM yyyy", { locale: tr })}
                  </p>
                  <p>Kalan gün: {purchase.remainingDays}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button onClick={() => router.push("/bilgilerim")} className="gap-2">
                  Panelime git
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => router.push("/paket-satin-al")} className="gap-2">
                  Diğer paketleri incele
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      }
    }

    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Ödeme durumu bekleniyor</CardTitle>
          <CardDescription>Ödeme sonucu alınamadı. Lütfen işlem tamamlandıktan sonra bu sayfayı ziyaret edin.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push("/paket-satin-al")} variant="outline" className="gap-2">
            Paket seçimine dön
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <ResponsiveLayout>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 py-8">
        {renderContent()}
      </div>
    </ResponsiveLayout>
  )
}
