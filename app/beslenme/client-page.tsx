"use client"

import { useEffect, useMemo, useState } from "react"
import ResponsiveLayout from "@/components/responsive-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Apple, Calendar, StickyNote, Utensils } from "lucide-react"
import { format } from "date-fns"
import { tr } from "date-fns/locale"

type ProgramMealItemPayload = {
  id?: string | null
  order?: number | null
  content?: string | null
}

type ProgramMealPayload = {
  id?: string | null
  order?: number | null
  title?: string | null
  items?: ProgramMealItemPayload[]
}

type ProgramDayPayload = {
  id?: string | null
  order?: number | null
  title?: string | null
  notes?: string | null
  meals?: ProgramMealPayload[]
}

type ProgramMealItem = {
  id: string | null
  order: number
  content: string
}

type ProgramMeal = {
  id: string | null
  order: number
  title: string
  items: ProgramMealItem[]
}

type ProgramDay = {
  id: string | null
  order: number
  title: string
  notes: string | null
  meals: ProgramMeal[]
}

type NutritionProgram = {
  id: string
  title: string
  description: string | null
  goal: string | null
  assignedAt: string
  templateId: string | null
  generalNotes: string | null
  days: ProgramDay[]
}

export default function BeslenmePage() {
  const [program, setProgram] = useState<NutritionProgram | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    const fetchProgram = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch("/api/client/nutrition-program", {
          signal: controller.signal,
        })

        if (response.status === 403) {
          window.location.href = "/paket-satin-al?source=beslenme"
          return
        }

        if (!response.ok) {
          throw new Error("Beslenme programı alınamadı")
        }

        const data = await response.json()
        const payload = data?.program ?? null

        if (payload) {
          setProgram({
            id: payload.id,
            title: payload.title,
            description: payload.description ?? null,
            goal: payload.goal ?? null,
            assignedAt: payload.assignedAt,
            templateId: payload.templateId ?? null,
            generalNotes: payload.generalNotes ?? null,
            days: Array.isArray(payload.days)
              ? payload.days.map((day: ProgramDayPayload, index: number) => ({
                  id: day.id ?? `${payload.id}-day-${index + 1}`,
                  order: typeof day.order === "number" ? day.order : index + 1,
                  title: day.title ?? `${index + 1}. Gün`,
                  notes: day.notes ?? null,
                  meals: Array.isArray(day.meals)
                    ? day.meals.map((meal: ProgramMealPayload, mealIndex: number) => ({
                        id: meal.id ?? `${payload.id}-day-${index + 1}-meal-${mealIndex + 1}`,
                        order: typeof meal.order === "number" ? meal.order : mealIndex + 1,
                        title: meal.title ?? `Öğün ${mealIndex + 1}`,
                        items: Array.isArray(meal.items)
                          ? meal.items.map((item: ProgramMealItemPayload, itemIndex: number) => ({
                              id:
                                item.id ??
                                `${payload.id}-day-${index + 1}-meal-${mealIndex + 1}-item-${itemIndex + 1}`,
                              order: typeof item.order === "number" ? item.order : itemIndex + 1,
                              content: item.content ?? "",
                            }))
                          : [],
                      }))
                    : [],
                }))
              : [],
          })
        } else {
          setProgram(null)
        }
      } catch (fetchError) {
        if ((fetchError as Error).name === "AbortError") return
        console.error("Client nutrition program fetch error:", fetchError)
        setError((fetchError as Error).message || "Bir sorun oluştu")
      } finally {
        setLoading(false)
      }
    }

    fetchProgram()

    return () => controller.abort()
  }, [])

  const totalMeals = useMemo(() => {
    if (!program?.days?.length) return 0
    return program.days.reduce((sum, day) => sum + day.meals.length, 0)
  }, [program])

  const totalItems = useMemo(() => {
    if (!program?.days?.length) return 0
    return program.days.reduce(
      (sum, day) => sum + day.meals.reduce((mealSum, meal) => mealSum + meal.items.length, 0),
      0,
    )
  }, [program])

  const formattedAssignedDate = useMemo(() => {
    if (!program?.assignedAt) return null
    try {
      return format(new Date(program.assignedAt), "dd MMMM yyyy", { locale: tr })
    } catch (_error) {
      return null
    }
  }, [program])

  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border border-border/60">
            <CardContent className="flex h-full flex-col justify-between space-y-3 p-4">
              <div className="flex items-center gap-3 text-muted-foreground text-sm">
                <Apple className="h-4 w-4 text-primary" />
                Toplam Gün
              </div>
              <div className="text-3xl font-semibold text-foreground">
                {loading ? <Skeleton className="h-8 w-16" /> : program?.days.length ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Planlanan gün sayısı eğitmeniniz tarafından belirlenir.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border/60">
            <CardContent className="flex h-full flex-col justify-between space-y-3 p-4">
              <div className="flex items-center gap-3 text-muted-foreground text-sm">
                <Utensils className="h-4 w-4 text-primary" />
                Toplam Öğün
              </div>
              <div className="text-3xl font-semibold text-foreground">
                {loading ? <Skeleton className="h-8 w-16" /> : totalMeals}
              </div>
              <p className="text-xs text-muted-foreground">
                Tüm öğünleriniz detaylarıyla birlikte aşağıda listelenir.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border/60">
            <CardContent className="flex h-full flex-col justify-between space-y-3 p-4">
              <div className="flex items-center gap-3 text-muted-foreground text-sm">
                <Calendar className="h-4 w-4 text-primary" />
                Başlangıç Tarihi
              </div>
              <div className="text-lg font-medium text-foreground">
                {loading ? <Skeleton className="h-6 w-32" /> : formattedAssignedDate ?? "Belirtilmedi"}
              </div>
              <p className="text-xs text-muted-foreground">
                Eğitmeniniz bu tarihten itibaren planı size atadı.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="space-y-3">
            <CardTitle className="text-2xl text-foreground">
              {loading ? <Skeleton className="h-8 w-64" /> : program?.title || "Beslenme Programı"}
            </CardTitle>
            {!loading && program?.goal && (
              <Badge variant="outline" className="w-fit uppercase tracking-wide text-xs">
                {program.goal}
              </Badge>
            )}
            {!loading && program?.description && (
              <p className="text-sm text-muted-foreground">{program.description}</p>
            )}
            {!loading && program?.generalNotes && (
              <div className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
                <StickyNote className="mt-0.5 h-3.5 w-3.5 text-primary" />
                <span>{program.generalNotes}</span>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && (
              <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            )}

            {!loading && error && (
              <div className="flex items-center gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            {!loading && !error && !program && (
              <div className="flex items-center gap-3 rounded-md border border-border px-4 py-6 text-sm text-muted-foreground">
                <Apple className="h-5 w-5" />
                Henüz beslenme planınız bulunmuyor. Eğitmeninizle iletişime geçerek bir plan talep edebilirsiniz.
              </div>
            )}

            {!loading && !error && program && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="w-fit text-xs">
                    {program.days.length} Gün
                  </Badge>
                  <Badge variant="secondary" className="w-fit text-xs">
                    {totalMeals} Öğün
                  </Badge>
                  <Badge variant="secondary" className="w-fit text-xs">
                    {totalItems} Öğün Öğesi
                  </Badge>
                </div>

                <div className="space-y-4">
                  {program.days.map((day) => {
                    const dayTitle = day.title || `${day.order}. Gün`
                    return (
                      <div
                        key={day.id ?? `day-${day.order}`}
                        className="rounded-lg border border-border/70 bg-card/40 p-4 space-y-4"
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">{dayTitle}</h3>
                            {day.notes && <p className="text-sm text-muted-foreground">{day.notes}</p>}
                          </div>
                          <Badge variant="outline" className="w-fit text-xs">
                            {day.meals.length} öğün
                          </Badge>
                        </div>

                        <div className="space-y-3">
                          {day.meals.length === 0 && (
                            <div className="rounded-md border border-dashed border-muted-foreground/40 p-3 text-sm text-muted-foreground">
                              Bu gün için öğün bilgisi bulunamadı.
                            </div>
                          )}

                          {day.meals.map((meal) => {
                            const mealTitle = meal.title || `${meal.order}. Öğün`
                            return (
                              <div
                                key={meal.id ?? `day-${day.order}-meal-${meal.order}`}
                                className="rounded-lg border border-border/60 bg-muted/40 p-3 space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-semibold text-foreground">{mealTitle}</p>
                                  <span className="text-xs text-muted-foreground">{meal.items.length} öğe</span>
                                </div>

                                {meal.items.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">Bu öğünde öğe bulunmuyor.</p>
                                ) : (
                                  <ul className="space-y-1.5">
                                    {meal.items.map((item) => (
                                      <li
                                        key={item.id ?? `day-${day.order}-meal-${meal.order}-item-${item.order}`}
                                        className="flex gap-2 text-sm text-foreground"
                                      >
                                        <span className="mt-1 block h-1.5 w-1.5 rounded-full bg-primary/70" />
                                        <span>{item.content || "Detay bulunmuyor"}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ResponsiveLayout>
  )
}
