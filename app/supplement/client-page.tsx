"use client"

import { useEffect, useMemo, useState } from "react"
import ResponsiveLayout from "@/components/responsive-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Pill,
  Clock,
  AlertCircle,
  Dumbbell,
  Heart,
  Zap,
  Calendar,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

type ClientSupplement = {
  id: string
  templateId: string
  name: string
  category: string | null
  brand: string | null
  dosage: string | null
  timing: string | null
  defaultDosage: string | null
  defaultTiming: string | null
  benefits: string[]
  timingOptions: string[]
  notes: string | null
}

type ClientSupplementProgram = {
  id: string
  title: string
  description: string | null
  assignedAt: string | null
  supplements: ClientSupplement[]
}

type CategoryStyle = {
  badgeClass: string
  accentTextClass: string
  noteBackgroundClass: string
  icon: LucideIcon
}

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  protein: {
    badgeClass: "bg-blue-100 text-blue-700",
    accentTextClass: "text-blue-600",
    noteBackgroundClass: "bg-blue-50",
    icon: Dumbbell,
  },
  performans: {
    badgeClass: "bg-purple-100 text-purple-700",
    accentTextClass: "text-purple-600",
    noteBackgroundClass: "bg-purple-50",
    icon: Zap,
  },
  vitamin: {
    badgeClass: "bg-green-100 text-green-700",
    accentTextClass: "text-green-600",
    noteBackgroundClass: "bg-green-50",
    icon: Heart,
  },
  "yağ asidi": {
    badgeClass: "bg-orange-100 text-orange-700",
    accentTextClass: "text-orange-600",
    noteBackgroundClass: "bg-orange-50",
    icon: Heart,
  },
  "amino asit": {
    badgeClass: "bg-pink-100 text-pink-700",
    accentTextClass: "text-pink-600",
    noteBackgroundClass: "bg-pink-50",
    icon: Zap,
  },
  mineral: {
    badgeClass: "bg-amber-100 text-amber-700",
    accentTextClass: "text-amber-600",
    noteBackgroundClass: "bg-amber-50",
    icon: Pill,
  },
}

const DEFAULT_CATEGORY_STYLE: CategoryStyle = {
  badgeClass: "bg-slate-100 text-slate-700",
  accentTextClass: "text-slate-600",
  noteBackgroundClass: "bg-slate-50",
  icon: Pill,
}

const getCategoryStyle = (category: string | null): CategoryStyle => {
  if (!category) return DEFAULT_CATEGORY_STYLE
  const key = category.toLocaleLowerCase("tr-TR")
  return CATEGORY_STYLES[key] ?? DEFAULT_CATEGORY_STYLE
}

const formatDate = (value: string | null) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

export default function ClientSupplementPage() {
  const [program, setProgram] = useState<ClientSupplementProgram | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    const fetchSupplements = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch("/api/client/supplements", {
          signal: controller.signal,
        })

        if (response.status === 403) {
          window.location.href = "/paket-satin-al?source=supplement"
          return
        }

        if (!response.ok) {
          throw new Error("Supplement programı alınamadı")
        }

        const data = await response.json()
        const payload = data?.program ?? null

        if (payload) {
          const supplements: ClientSupplement[] = Array.isArray(payload.supplements)
            ? payload.supplements.map((supplement: ClientSupplement) => ({
                id: supplement.id,
                templateId: supplement.templateId,
                name: supplement.name,
                category: supplement.category ?? null,
                brand: supplement.brand ?? null,
                dosage: supplement.dosage ?? null,
                timing: supplement.timing ?? null,
                defaultDosage: supplement.defaultDosage ?? null,
                defaultTiming: supplement.defaultTiming ?? null,
                benefits: Array.isArray(supplement.benefits) ? supplement.benefits : [],
                timingOptions: Array.isArray(supplement.timingOptions) ? supplement.timingOptions : [],
                notes: supplement.notes ?? null,
              }))
            : []

          setProgram({
            id: payload.id,
            title: payload.title,
            description: payload.description ?? null,
            assignedAt: payload.assignedAt ?? null,
            supplements,
          })
        } else {
          setProgram(null)
        }
      } catch (fetchError) {
        if ((fetchError as Error).name === "AbortError") return
        console.error("Client supplement program fetch error:", fetchError)
        setError((fetchError as Error).message || "Bir sorun oluştu")
      } finally {
        setLoading(false)
      }
    }

    fetchSupplements()

    return () => controller.abort()
  }, [])

  const supplements = useMemo<ClientSupplement[]>(() => program?.supplements ?? [], [program])

  const getDosageLabel = (supplement: ClientSupplement) =>
    supplement.dosage ?? supplement.defaultDosage ?? "Dozaj belirtilmedi"

  const getTimingLabel = (supplement: ClientSupplement) =>
    supplement.timing ?? supplement.defaultTiming ?? "Kullanım zamanı belirtilmedi"

  const getNoteMessage = (supplement: ClientSupplement) =>
    supplement.notes?.trim() ||
    `${supplement.name} takviyesini ${getTimingLabel(supplement)} kullanmanız önerilir. Bol su içmeyi unutmayın.`

  const isEmptyState = !loading && !error && (!program || supplements.length === 0)
  const assignedDateLabel = program ? formatDate(program.assignedAt) : null

  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Supplement Takviyeler</h1>
            <p className="text-gray-600">Eğitmeninin hazırladığı supplement programını burada takip et.</p>
          </div>
          {assignedDateLabel && (
            <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{assignedDateLabel}</span>
            </div>
          )}
        </div>

        {program?.description && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-foreground">{program.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{program.description}</CardContent>
          </Card>
        )}

        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={`supplement-skeleton-${index}`}>
                <CardHeader className="space-y-3">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-16 w-full" />
                  <div className="flex justify-end">
                    <Skeleton className="h-9 w-28" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {isEmptyState && (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Pill className="h-5 w-5 text-muted-foreground" />
              </div>
              Henüz bir supplement programı atanmadı. Eğitmeninle iletişime geçerek program talep edebilirsin.
            </CardContent>
          </Card>
        )}

        {!loading && !error && supplements.length > 0 && (
          <div className="space-y-4">
            {supplements.map((supplement) => {
              const style = getCategoryStyle(supplement.category)
              const SupplementIcon = style.icon

              return (
                <Card key={supplement.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                      <SupplementIcon className={`h-5 w-5 ${style.accentTextClass}`} />
                      {supplement.name}
                    </CardTitle>
                    {supplement.brand && <p className="text-sm text-muted-foreground">{supplement.brand}</p>}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge className={style.badgeClass}>{supplement.category ?? "Kategori yok"}</Badge>
                      <Badge variant="outline">{getDosageLabel(supplement)}</Badge>
                    </div>

                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium text-foreground">{getTimingLabel(supplement)}</span>
                      </div>
                      {supplement.timingOptions.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {supplement.timingOptions.map((option) => (
                            <Badge key={option} variant="outline" className="text-xs">
                              {option}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {supplement.benefits.length > 0 && (
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p className="font-medium text-foreground">Faydalar</p>
                        <ul className="list-disc space-y-1 pl-4">
                          {supplement.benefits.map((benefit, index) => (
                            <li key={`${supplement.id}-benefit-${index}`}>{benefit}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className={`${style.noteBackgroundClass} rounded-md p-3`}>
                      <div className="mb-1 flex items-center gap-2">
                        <AlertCircle className={`h-4 w-4 ${style.accentTextClass}`} />
                        <span className={`text-sm font-semibold ${style.accentTextClass}`}>Önemli Not</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{getNoteMessage(supplement)}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </ResponsiveLayout>
  )
}
