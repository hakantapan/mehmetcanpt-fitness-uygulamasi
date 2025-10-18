"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { TrainerLayout } from "@/components/trainer-layout"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus,
  Copy,
  Edit,
  Trash2,
  Calendar,
  BookOpen,
  Apple,
  ChevronUp,
  ChevronDown,
} from "lucide-react"

const createLocalId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

type DietMealItem = {
  id: string
  order: number
  content: string
}

type DietMeal = {
  id: string
  order: number
  title: string
  items: DietMealItem[]
}

type DietDay = {
  id: string
  order: number
  title: string
  notes: string
  meals: DietMeal[]
}

type DietTemplate = {
  id: string
  name: string
  goal?: string | null
  description?: string | null
  createdAt: string
  updatedAt: string
  days: DietDay[]
}

const createEmptyMeal = (order: number): DietMeal => ({
  id: createLocalId(),
  order,
  title: `Öğün ${order}`,
  items: [],
})

const createEmptyDay = (order: number): DietDay => ({
  id: createLocalId(),
  order,
  title: `${order}. Gün`,
  notes: "",
  meals: [createEmptyMeal(1)],
})

const reorderMealItems = (items: DietMealItem[]): DietMealItem[] =>
  items
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({
      ...item,
      order: index + 1,
      content: item.content.trim(),
    }))
    .filter((item) => item.content.length > 0)

const normalizeMeals = (meals: DietMeal[]): DietMeal[] =>
  meals
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((meal, index) => ({
      ...meal,
      order: index + 1,
      title: meal.title.trim() || `Öğün ${index + 1}`,
      items: reorderMealItems(meal.items),
    }))

const normalizeDays = (days: DietDay[]): DietDay[] =>
  days
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((day, index) => ({
      ...day,
      order: index + 1,
      title: day.title.trim() || `${index + 1}. Gün`,
      notes: day.notes?.trim() || "",
      meals: normalizeMeals(day.meals),
    }))

export default function DietProgramPage() {
  const [activeTab, setActiveTab] = useState("templates")
  const [dietTemplates, setDietTemplates] = useState<DietTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [templatesError, setTemplatesError] = useState<string | null>(null)

  const [templateName, setTemplateName] = useState("")
  const [templateGoal, setTemplateGoal] = useState("")
  const [templateDescription, setTemplateDescription] = useState("")
  const [plannerDays, setPlannerDays] = useState<DietDay[]>([createEmptyDay(1)])
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null)
  const [mealDrafts, setMealDrafts] = useState<Record<string, string>>({})
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [plannerError, setPlannerError] = useState<string | null>(null)
  const [plannerSuccess, setPlannerSuccess] = useState<string | null>(null)
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)
  const plannerTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!selectedDayId && plannerDays.length) {
      setSelectedDayId(plannerDays[0].id)
    }
  }, [plannerDays, selectedDayId])

  useEffect(() => {
    return () => {
      if (plannerTimeoutRef.current) {
        clearTimeout(plannerTimeoutRef.current)
      }
    }
  }, [])

  const showPlannerMessage = (message: string) => {
    if (plannerTimeoutRef.current) {
      clearTimeout(plannerTimeoutRef.current)
    }
    setPlannerSuccess(message)
    plannerTimeoutRef.current = setTimeout(() => {
      setPlannerSuccess(null)
      plannerTimeoutRef.current = null
    }, 2000)
  }

  const resetPlannerState = () => {
    const firstDay = createEmptyDay(1)
    setPlannerDays([firstDay])
    setSelectedDayId(firstDay.id)
    setTemplateName("")
    setTemplateGoal("")
    setTemplateDescription("")
    setMealDrafts({})
    setEditingTemplateId(null)
    setPlannerError(null)
    setPlannerSuccess(null)
    if (plannerTimeoutRef.current) {
      clearTimeout(plannerTimeoutRef.current)
      plannerTimeoutRef.current = null
    }
  }

  const fetchTemplates = useCallback(async () => {
    try {
      setTemplatesLoading(true)
      setTemplatesError(null)
      const response = await fetch("/api/trainer/diets")
      if (!response.ok) throw new Error("Diyet şablonları alınamadı")
      const data = await response.json()
      const templates: DietTemplate[] = Array.isArray(data.templates)
        ? data.templates.map((template: any) => ({
            id: template.id,
            name: template.name,
            goal: template.goal ?? null,
            description: template.description ?? null,
            createdAt: template.createdAt,
            updatedAt: template.updatedAt,
            days: Array.isArray(template.days)
              ? template.days.map((day: any, dayIndex: number) => ({
                  id: day.id ?? createLocalId(),
                  order: day.order ?? dayIndex + 1,
                  title: day.title ?? `${dayIndex + 1}. Gün`,
                  notes: day.notes ?? "",
                  meals: Array.isArray(day.meals)
                    ? day.meals.map((meal: any, mealIndex: number) => ({
                        id: meal.id ?? createLocalId(),
                        order: meal.order ?? mealIndex + 1,
                        title: meal.title ?? `Öğün ${mealIndex + 1}`,
                        items: Array.isArray(meal.items)
                          ? meal.items.map((item: any, itemIndex: number) => ({
                              id: item.id ?? createLocalId(),
                              order: item.order ?? itemIndex + 1,
                              content: item.content ?? "",
                            }))
                          : [],
                      }))
                    : [],
                }))
              : [],
          }))
        : []
      setDietTemplates(templates)
    } catch (error) {
      console.error("Diet template fetch error:", error)
      setTemplatesError((error as Error).message || "Diyet şablonları alınamadı")
    } finally {
      setTemplatesLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchTemplates()
  }, [fetchTemplates])

  const totalDays = useMemo(
    () => dietTemplates.reduce((sum, template) => sum + template.days.length, 0),
    [dietTemplates],
  )

  const totalMeals = useMemo(
    () =>
      dietTemplates.reduce(
        (sum, template) =>
          sum + template.days.reduce((inner, day) => inner + day.meals.length, 0),
        0,
      ),
    [dietTemplates],
  )

  const selectedDay = useMemo(() => {
    if (!selectedDayId) return plannerDays[0]
    return plannerDays.find((day) => day.id === selectedDayId) ?? plannerDays[0]
  }, [plannerDays, selectedDayId])

  const handleAddDay = () => {
    setPlannerDays((prev) => normalizeDays([...prev, createEmptyDay(prev.length + 1)]))
  }

  const handleRemoveDay = (dayId: string) => {
    setPlannerDays((prev) => {
      if (prev.length === 1) return prev
      const filtered = prev.filter((day) => day.id !== dayId)
      const normalized = normalizeDays(filtered)
      if (selectedDayId === dayId) {
        setSelectedDayId(normalized[0]?.id ?? null)
      }
      return normalized
    })
  }

  const handleMoveDay = (dayId: string, direction: "up" | "down") => {
    setPlannerDays((prev) => {
      const index = prev.findIndex((day) => day.id === dayId)
      if (index === -1) return prev
      if (direction === "up" && index === 0) return prev
      if (direction === "down" && index === prev.length - 1) return prev
      const next = prev.slice()
      const target = direction === "up" ? index - 1 : index + 1
      const [current] = next.splice(index, 1)
      next.splice(target, 0, current)
      return normalizeDays(next)
    })
  }

  const updateDay = (dayId: string, updates: Partial<Omit<DietDay, "id" | "order" | "meals">>) => {
    setPlannerDays((prev) =>
      prev.map((day) => (day.id === dayId ? { ...day, ...updates } : day)),
    )
  }

  const handleAddMeal = (dayId: string) => {
    setPlannerDays((prev) =>
      prev.map((day) => {
        if (day.id !== dayId) return day
        return {
          ...day,
          meals: normalizeMeals([...day.meals, createEmptyMeal(day.meals.length + 1)]),
        }
      }),
    )
  }

  const handleRemoveMeal = (dayId: string, mealId: string) => {
    setPlannerDays((prev) =>
      prev.map((day) => {
        if (day.id !== dayId) return day
        if (day.meals.length === 1) return day
        return {
          ...day,
          meals: normalizeMeals(day.meals.filter((meal) => meal.id !== mealId)),
        }
      }),
    )
  }

  const handleMealTitleChange = (dayId: string, mealId: string, value: string) => {
    setPlannerDays((prev) =>
      prev.map((day) => {
        if (day.id !== dayId) return day
        return {
          ...day,
          meals: day.meals.map((meal) =>
            meal.id === mealId ? { ...meal, title: value } : meal,
          ),
        }
      }),
    )
  }

  const handleMealDraftChange = (mealId: string, value: string) => {
    setMealDrafts((prev) => ({ ...prev, [mealId]: value }))
  }

  const handleAddMealItem = (dayId: string, mealId: string) => {
    const content = mealDrafts[mealId]?.trim()
    if (!content) return
    setPlannerDays((prev) =>
      prev.map((day) => {
        if (day.id !== dayId) return day
        const updatedMeals = day.meals.map((meal) =>
          meal.id === mealId
            ? {
                ...meal,
                items: [
                  ...meal.items,
                  {
                    id: createLocalId(),
                    order: meal.items.length + 1,
                    content,
                  },
                ],
              }
            : meal,
        )
        return {
          ...day,
          meals: normalizeMeals(updatedMeals),
        }
      }),
    )
    setMealDrafts((prev) => ({ ...prev, [mealId]: "" }))
  }

  const handleMealItemChange = (dayId: string, mealId: string, itemId: string, value: string) => {
    setPlannerDays((prev) =>
      prev.map((day) => {
        if (day.id !== dayId) return day
        return {
          ...day,
          meals: day.meals.map((meal) =>
            meal.id === mealId
              ? {
                  ...meal,
                  items: meal.items.map((item) =>
                    item.id === itemId ? { ...item, content: value } : item,
                  ),
                }
              : meal,
          ),
        }
      }),
    )
  }

  const handleRemoveMealItem = (dayId: string, mealId: string, itemId: string) => {
    setPlannerDays((prev) =>
      prev.map((day) => {
        if (day.id !== dayId) return day
        const updatedMeals = day.meals.map((meal) =>
          meal.id === mealId
            ? {
                ...meal,
                items: meal.items.filter((item) => item.id !== itemId),
              }
            : meal,
        )
        return {
          ...day,
          meals: normalizeMeals(updatedMeals),
        }
      }),
    )
  }

  const openCreatePlanner = () => {
    resetPlannerState()
    setActiveTab("planner")
  }

  const openEditPlanner = (template: DietTemplate) => {
    setEditingTemplateId(template.id)
    setTemplateName(template.name)
    setTemplateGoal(template.goal ?? "")
    setTemplateDescription(template.description ?? "")

    const mappedDays = template.days.length
      ? template.days.map((day) => ({
          id: createLocalId(),
          order: day.order,
          title: day.title,
          notes: day.notes ?? "",
          meals: day.meals.length
            ? day.meals.map((meal) => ({
                id: createLocalId(),
                order: meal.order,
                title: meal.title,
                items: meal.items.map((item) => ({
                  id: createLocalId(),
                  order: item.order,
                  content: item.content,
                })),
              }))
            : [createEmptyMeal(1)],
        }))
      : [createEmptyDay(1)]

    const normalized = normalizeDays(mappedDays)
    setPlannerDays(normalized)
    setSelectedDayId(normalized[0]?.id ?? null)
    setMealDrafts({})
    setPlannerError(null)
    setPlannerSuccess(null)
    setActiveTab("planner")
  }

  const duplicateTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/trainer/diets/${templateId}/duplicate`, {
        method: "POST",
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || "Diyet şablonu kopyalanamadı")
      }
      await fetchTemplates()
    } catch (error) {
      console.error("Diet duplicate error:", error)
      setTemplatesError((error as Error).message || "Diyet şablonu kopyalanamadı")
    }
  }

  const deleteTemplate = async (templateId: string) => {
    const confirmDelete =
      typeof window !== "undefined"
        ? window.confirm("Diyet şablonunu silmek istediğinize emin misiniz?")
        : true
    if (!confirmDelete) return

    try {
      const response = await fetch(`/api/trainer/diets/${templateId}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || "Diyet şablonu silinemedi")
      }
      await fetchTemplates()
    } catch (error) {
      console.error("Diet delete error:", error)
      setTemplatesError((error as Error).message || "Diyet şablonu silinemedi")
    }
  }

  const saveTemplate = async () => {
    if (!templateName.trim()) {
      setPlannerError("Diyet adı zorunludur")
      return
    }
    if (!plannerDays.length) {
      setPlannerError("En az bir gün eklemelisiniz")
      return
    }

    setIsSavingTemplate(true)
    setPlannerError(null)
    try {
      const normalizedDays = normalizeDays(plannerDays)
      const payload = {
        name: templateName.trim(),
        goal: templateGoal.trim() || null,
        description: templateDescription.trim() || null,
        days: normalizedDays.map((day, dayIndex) => ({
          order: dayIndex + 1,
          title: day.title.trim() || `${dayIndex + 1}. Gün`,
          notes: day.notes.trim() || null,
          meals: day.meals.map((meal, mealIndex) => ({
            order: mealIndex + 1,
            title: meal.title.trim() || `Öğün ${mealIndex + 1}`,
            items: meal.items.map((item, itemIndex) => ({
              order: itemIndex + 1,
              content: item.content.trim(),
            })),
          })),
        })),
      }

      const endpoint = editingTemplateId
        ? `/api/trainer/diets/${editingTemplateId}`
        : "/api/trainer/diets"
      const method = editingTemplateId ? "PUT" : "POST"

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(
          data?.error
            || (editingTemplateId
              ? "Diyet şablonu güncellenemedi"
              : "Diyet şablonu oluşturulamadı"),
        )
      }

      await fetchTemplates()
      showPlannerMessage(
        editingTemplateId ? "Diyet şablonu güncellendi" : "Diyet şablonu oluşturuldu",
      )
      resetPlannerState()
      setActiveTab("templates")
    } catch (error) {
      console.error(
        editingTemplateId ? "Diet template update error:" : "Diet template create error:",
        error,
      )
      const fallbackMessage = editingTemplateId
        ? "Diyet şablonu güncellenemedi"
        : "Diyet şablonu oluşturulamadı"
      setPlannerError(
        error instanceof Error && error.message ? error.message : fallbackMessage,
      )
    } finally {
      setIsSavingTemplate(false)
    }
  }

  const selectedDayMealsCount = selectedDay?.meals.length ?? 0
  const totalTemplates = dietTemplates.length

  return (
    <TrainerLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-foreground">Diyet Programları</h1>
            <p className="text-sm text-muted-foreground">
              Danışanlarınız için diyet şablonlarını oluşturun, yönetin ve paylaşın.
            </p>
          </div>
          <Button onClick={openCreatePlanner}>
            <Plus className="mr-2 h-4 w-4" />
            Yeni Diyet Şablonu
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm text-muted-foreground">Şablon Sayısı</p>
                <p className="text-2xl font-semibold text-foreground">{totalTemplates}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm text-muted-foreground">Toplam Gün</p>
                <p className="text-2xl font-semibold text-foreground">{totalDays}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10">
                <Calendar className="h-5 w-5 text-secondary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm text-muted-foreground">Toplam Öğün</p>
                <p className="text-2xl font-semibold text-foreground">{totalMeals}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                <Apple className="h-5 w-5 text-accent" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates">Diyet Şablonları</TabsTrigger>
            <TabsTrigger value="planner">Planlayıcı</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-foreground">Diyet Şablonları</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Mevcut şablonları görüntüleyin, düzenleyin veya kopyalayın.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void fetchTemplates()
                  }}
                  disabled={templatesLoading}
                >
                  Yenile
                </Button>
              </CardHeader>
              <CardContent>
                {templatesLoading && (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Diyet şablonları yükleniyor...
                  </div>
                )}
                {!templatesLoading && templatesError && (
                  <div className="py-8 text-center text-sm text-destructive">{templatesError}</div>
                )}
                {!templatesLoading && !templatesError && dietTemplates.length === 0 && (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Henüz diyet şablonu bulunmuyor.
                  </div>
                )}
                {!templatesLoading && !templatesError && dietTemplates.length > 0 && (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {dietTemplates.map((template) => {
                      const mealCount = template.days.reduce(
                        (outer, day) => outer + day.meals.length,
                        0,
                      )
                      const itemCount = template.days.reduce(
                        (outer, day) =>
                          outer + day.meals.reduce((inner, meal) => inner + meal.items.length, 0),
                        0,
                      )
                      return (
                        <Card key={template.id} className="border border-border/70">
                          <CardHeader className="space-y-2">
                            <CardTitle className="text-base text-foreground">{template.name}</CardTitle>
                            {template.description && (
                              <p className="text-sm text-muted-foreground">{template.description}</p>
                            )}
                            {template.goal && (
                              <Badge variant="outline" className="w-fit text-xs uppercase tracking-wide">
                                {template.goal}
                              </Badge>
                            )}
                          </CardHeader>
                          <CardContent className="space-y-3 text-sm">
                            <div className="flex items-center justify-between text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {template.days.length} gün
                              </div>
                              <div className="flex items-center gap-2">
                                <Apple className="h-4 w-4" />
                                {mealCount} öğün
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">Toplam {itemCount} öğün öğesi</div>
                            <div className="space-y-2">
                              {template.days.slice(0, 2).map((day) => (
                                <div key={day.id} className="rounded border border-border/60 p-2">
                                  <p className="text-xs font-medium text-muted-foreground">{day.title}</p>
                                  <p className="text-xs text-muted-foreground/80">
                                    {day.meals.length} öğün •{" "}
                                    {day.meals.reduce((sum, meal) => sum + meal.items.length, 0)} öğe
                                  </p>
                                </div>
                              ))}
                              {template.days.length > 2 && (
                                <p className="text-xs text-muted-foreground">
                                  +{template.days.length - 2} gün daha
                                </p>
                              )}
                            </div>
                            <div className="flex items-center justify-end gap-1 pt-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditPlanner(template)}
                                aria-label="Düzenle"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  void duplicateTemplate(template.id)
                                }}
                                aria-label="Kopyala"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  void deleteTemplate(template.id)
                                }}
                                aria-label="Sil"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="planner" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-foreground">
                    {editingTemplateId ? "Diyet Şablonunu Düzenle" : "Yeni Diyet Şablonu"}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Diyet planı bilgilerini girin ve öğünleri düzenleyin.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {plannerError && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {plannerError}
                  </div>
                )}
                {plannerSuccess && (
                  <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">
                    {plannerSuccess}
                  </div>
                )}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2 md:col-span-1">
                    <Label htmlFor="diet-template-name">Şablon Adı</Label>
                    <Input
                      id="diet-template-name"
                      value={templateName}
                      onChange={(event) => setTemplateName(event.target.value)}
                      placeholder="Örnek: Haftalık Kilo Verme Planı"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-1">
                    <Label htmlFor="diet-template-goal">Hedef</Label>
                    <Input
                      id="diet-template-goal"
                      value={templateGoal}
                      onChange={(event) => setTemplateGoal(event.target.value)}
                      placeholder="Örnek: Kilo verme, kas kazanma"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-3">
                    <Label htmlFor="diet-template-description">Açıklama</Label>
                    <Textarea
                      id="diet-template-description"
                      value={templateDescription}
                      onChange={(event) => setTemplateDescription(event.target.value)}
                      placeholder="Planın genel açıklamasını ve önemli notları ekleyin."
                      rows={3}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between">
                <div>
                  {selectedDay
                    ? `${selectedDay.title} için ${selectedDayMealsCount} öğün düzenleniyor`
                    : "Henüz bir gün seçilmedi"}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={resetPlannerState}>
                    Planı Sıfırla
                  </Button>
                  <Button onClick={saveTemplate} disabled={isSavingTemplate}>
                    {isSavingTemplate ? "Kaydediliyor..." : "Planı Kaydet"}
                  </Button>
                </div>
              </CardFooter>
            </Card>

            <div className="grid gap-6 lg:grid-cols-[260px,1fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-foreground">Günler</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {plannerDays.map((day, index) => {
                      const isSelected = selectedDayId === day.id || (!selectedDayId && index === 0)
                      return (
                        <div
                          key={day.id}
                          className={`rounded-lg border p-3 text-sm transition ${
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/60"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <button
                              type="button"
                              className="flex-1 text-left font-medium text-foreground"
                              onClick={() => setSelectedDayId(day.id)}
                            >
                              {day.order}. {day.title}
                            </button>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleMoveDay(day.id, "up")}
                                disabled={index === 0}
                                aria-label="Yukarı taşı"
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleMoveDay(day.id, "down")}
                                disabled={index === plannerDays.length - 1}
                                aria-label="Aşağı taşı"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveDay(day.id)}
                                disabled={plannerDays.length === 1}
                                aria-label="Günü sil"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                            <span>{day.meals.length} öğün</span>
                            <span>
                              {day.meals.reduce((sum, meal) => sum + meal.items.length, 0)} öğe
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <Button variant="outline" onClick={handleAddDay}>
                    <Plus className="mr-2 h-4 w-4" />
                    Yeni Gün Ekle
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-foreground">
                    {selectedDay ? selectedDay.title : "Gün Detayı"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedDay ? (
                    <>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`day-title-${selectedDay.id}`}>Gün Başlığı</Label>
                          <Input
                            id={`day-title-${selectedDay.id}`}
                            value={selectedDay.title}
                            onChange={(event) =>
                              updateDay(selectedDay.id, { title: event.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor={`day-notes-${selectedDay.id}`}>Notlar</Label>
                          <Textarea
                            id={`day-notes-${selectedDay.id}`}
                            value={selectedDay.notes}
                            onChange={(event) =>
                              updateDay(selectedDay.id, { notes: event.target.value })
                            }
                            rows={3}
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        {selectedDay.meals.map((meal) => (
                          <div key={meal.id} className="space-y-3 rounded-lg border border-border/70 p-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 space-y-2">
                                <Label htmlFor={`meal-title-${meal.id}`}>Öğün Başlığı</Label>
                                <Input
                                  id={`meal-title-${meal.id}`}
                                  value={meal.title}
                                  onChange={(event) =>
                                    handleMealTitleChange(selectedDay.id, meal.id, event.target.value)
                                  }
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveMeal(selectedDay.id, meal.id)}
                                disabled={selectedDay.meals.length === 1}
                                aria-label="Öğünü sil"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="space-y-3">
                              {meal.items.map((item) => (
                                <div key={item.id} className="flex items-center gap-2">
                                  <Input
                                    value={item.content}
                                    onChange={(event) =>
                                      handleMealItemChange(
                                        selectedDay.id,
                                        meal.id,
                                        item.id,
                                        event.target.value,
                                      )
                                    }
                                    placeholder="Öğün öğesi"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      handleRemoveMealItem(selectedDay.id, meal.id, item.id)
                                    }
                                    aria-label="Öğeyi sil"
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}

                              <div className="flex items-center gap-2">
                                <Input
                                  value={mealDrafts[meal.id] ?? ""}
                                  onChange={(event) => handleMealDraftChange(meal.id, event.target.value)}
                                  placeholder="Yeni öğün öğesi ekle"
                                />
                                <Button
                                  onClick={() => handleAddMealItem(selectedDay.id, meal.id)}
                                  disabled={!mealDrafts[meal.id]?.trim()}
                                >
                                  Ekle
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}

                        <Button variant="outline" onClick={() => handleAddMeal(selectedDay.id)} type="button">
                          <Plus className="mr-2 h-4 w-4" />
                          Öğün Ekle
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      Planlayıcıya en az bir gün ekleyin.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TrainerLayout>
  )
}
