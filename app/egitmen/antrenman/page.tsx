"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { TrainerLayout } from "@/components/trainer-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Search,
  Plus,
  Copy,
  Edit,
  Trash2,
  Dumbbell,
  Calendar,
  BookOpen,
  Video,
  ExternalLink,
  ChevronUp,
  ChevronDown,
} from "lucide-react"

type ExerciseTemplate = {
  id: string
  name: string
  category?: string | null
  equipment?: string | null
  difficulty?: string | null
  instructions?: string | null
  videoUrl?: string | null
  targetMuscles: string[]
  tips?: string | null
  safetyNotes?: string | null
  variations: string[]
}

type TemplateExercise = {
  id: string
  order: number
  sets: number | null
  reps: string | null
  rest: number | null
  weight: string | null
  notes: string | null
  exerciseTemplateId: string
  exerciseTemplate: ExerciseTemplate
}

type TemplateDay = {
  id: string
  order: number
  label: string
  videoUrl?: string | null
  notes?: string | null
  exercises: TemplateExercise[]
}

type WorkoutTemplate = {
  id: string
  name: string
  description?: string | null
  videoUrl?: string | null
  muscleGroups: string[]
  createdAt: string
  assignedClients?: number
  days: TemplateDay[]
}

type ClientsResponse = {
  templates: WorkoutTemplate[]
}

type ExercisesResponse = {
  exercises: ExerciseTemplate[]
}

type PlannerExercise = {
  localId: string
  exerciseTemplateId: string
  exerciseName: string
  order: number
  sets: number
  reps: string
  rest: number
  weight: string
  notes: string
}

type PlannerDay = {
  localId: string
  order: number
  label: string
  videoUrl: string
  notes: string
  exercises: PlannerExercise[]
}

type ExerciseFormState = {
  id?: string
  name: string
  category: string
  equipment: string
  difficulty: string
  instructions: string
  targetMuscles: string
  videoUrl: string
  tips: string
  safetyNotes: string
  variations: string
}

const createLocalId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

const createEmptyPlannerDay = (order: number): PlannerDay => ({
  localId: createLocalId(),
  order,
  label: `${order}. Gün`,
  videoUrl: "",
  notes: "",
  exercises: [],
})

const normalizePlannerExercises = (exercises: PlannerExercise[]): PlannerExercise[] =>
  exercises
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((exercise, index) => ({
      ...exercise,
      order: index + 1,
    }))

const normalizePlannerDays = (days: PlannerDay[]): PlannerDay[] =>
  days
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((day, index) => ({
      ...day,
      order: index + 1,
      label: day.label.trim() || `${index + 1}. Gün`,
      exercises: normalizePlannerExercises(day.exercises),
    }))

const stringOrNull = (value: string) => {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const numberOrNull = (value: number) => {
  if (Number.isNaN(value) || value === undefined || value === null) return null
  return value
}

const extractMuscleGroups = (value: string) =>
  value
    .split(",")
    .map((group) => group.trim())
    .filter(Boolean)

const createEmptyExerciseForm = (): ExerciseFormState => ({
  name: "",
  category: "",
  equipment: "",
  difficulty: "",
  instructions: "",
  targetMuscles: "",
  videoUrl: "",
  tips: "",
  safetyNotes: "",
  variations: "",
})

export default function WorkoutProgramPage() {
  const [activeTab, setActiveTab] = useState<"templates" | "planner" | "library">("templates")

  const [exerciseLibrary, setExerciseLibrary] = useState<ExerciseTemplate[]>([])
  const [exercisesLoading, setExercisesLoading] = useState(true)
  const [exercisesError, setExercisesError] = useState<string | null>(null)
  const [isExerciseFormOpen, setIsExerciseFormOpen] = useState(false)
  const [exerciseFormMode, setExerciseFormMode] = useState<'create' | 'edit'>('create')
  const [exerciseForm, setExerciseForm] = useState<ExerciseFormState>(createEmptyExerciseForm())
  const [isSavingExercise, setIsSavingExercise] = useState(false)
  const [libraryError, setLibraryError] = useState<string | null>(null)
  const [librarySuccess, setLibrarySuccess] = useState<string | null>(null)

  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [templatesError, setTemplatesError] = useState<string | null>(null)
  const [templateActionId, setTemplateActionId] = useState<string | null>(null)

  const [newProgramName, setNewProgramName] = useState("")
  const [newProgramDescription, setNewProgramDescription] = useState("")
  const [muscleGroupsInput, setMuscleGroupsInput] = useState("")
  const [isSavingProgram, setIsSavingProgram] = useState(false)
  const [plannerError, setPlannerError] = useState<string | null>(null)
  const [plannerSuccess, setPlannerSuccess] = useState<string | null>(null)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)

  const [plannerDays, setPlannerDays] = useState<PlannerDay[]>([createEmptyPlannerDay(1)])
  const [selectedDayId, setSelectedDayId] = useState<string>(plannerDays[0].localId)
  const plannerSuccessTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const librarySuccessTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  const [isExerciseDetailOpen, setIsExerciseDetailOpen] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<ExerciseTemplate | null>(null)

  useEffect(() => {
    if (!plannerDays.some((day) => day.localId === selectedDayId)) {
      const fallbackId = plannerDays[0]?.localId
      if (fallbackId) setSelectedDayId(fallbackId)
    }
  }, [plannerDays, selectedDayId])

  const refreshExerciseLibrary = useCallback(async () => {
    try {
      setExercisesLoading(true)
      setExercisesError(null)
      const response = await fetch("/api/trainer/exercises")
      if (!response.ok) throw new Error("Egzersizler alınamadı")
      const data: ExercisesResponse = await response.json()
      setExerciseLibrary(Array.isArray(data.exercises) ? data.exercises : [])
    } catch (error) {
      console.error("Exercise fetch error:", error)
      setExercisesError((error as Error).message || "Egzersiz listesi alınamadı")
    } finally {
      setExercisesLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshExerciseLibrary()
  }, [refreshExerciseLibrary])

  const refreshTemplates = async () => {
    try {
      setTemplatesLoading(true)
      setTemplatesError(null)
      const response = await fetch("/api/trainer/workout-templates")
      if (!response.ok) throw new Error("Program şablonları alınamadı")
      const data: ClientsResponse = await response.json()
      const normalized: WorkoutTemplate[] = Array.isArray(data.templates)
        ? data.templates.map((template) => ({
            ...template,
            muscleGroups: Array.isArray(template.muscleGroups) ? template.muscleGroups : [],
            days: Array.isArray(template.days)
              ? template.days
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((day) => ({
                    ...day,
                    exercises: Array.isArray(day.exercises)
                      ? day.exercises
                          .slice()
                          .sort((a, b) => a.order - b.order)
                      : [],
                  }))
              : [],
          }))
        : []

      setTemplates(normalized)
    } catch (error) {
      console.error("Template fetch error:", error)
      setTemplatesError((error as Error).message || "Program şablonları alınamadı")
    } finally {
      setTemplatesLoading(false)
    }
  }

  useEffect(() => {
    void refreshTemplates()
  }, [])

  const exerciseCategories = useMemo(() => {
    const categories = new Set<string>()
    exerciseLibrary.forEach((exercise) => {
      if (exercise.category) categories.add(exercise.category)
    })
    return ["all", ...Array.from(categories)]
  }, [exerciseLibrary])

  const filteredExercises = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase()
    return exerciseLibrary.filter((exercise) => {
      const matchesSearch =
        exercise.name.toLowerCase().includes(lowerSearch) ||
        (exercise.category?.toLowerCase().includes(lowerSearch) ?? false)
      const matchesCategory = selectedCategory === "all" || exercise.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [exerciseLibrary, searchTerm, selectedCategory])

  const totalTemplates = templates.length
  const totalExercises = templates.reduce(
    (sum, template) =>
      sum + template.days.reduce((inner, day) => inner + day.exercises.length, 0),
    0,
  )
  const totalAssignments = templates.reduce((sum, template) => sum + (template.assignedClients ?? 0), 0)

  const splitInputList = (value: string) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

  const selectedPlannerDay = plannerDays.find((day) => day.localId === selectedDayId) ?? plannerDays[0]

  const resetPlannerForm = () => {
    const initialDay = createEmptyPlannerDay(1)
    setPlannerDays([initialDay])
    setSelectedDayId(initialDay.localId)
    setNewProgramName("")
    setNewProgramDescription("")
    setMuscleGroupsInput("")
    setEditingTemplateId(null)
    setPlannerError(null)
    setPlannerSuccess(null)
    if (plannerSuccessTimeoutRef.current) {
      clearTimeout(plannerSuccessTimeoutRef.current)
      plannerSuccessTimeoutRef.current = null
    }
  }

  const resetExerciseForm = () => {
    setExerciseForm(createEmptyExerciseForm())
    setExerciseFormMode('create')
    setLibraryError(null)
  }

  useEffect(() => {
    return () => {
      if (plannerSuccessTimeoutRef.current) {
        clearTimeout(plannerSuccessTimeoutRef.current)
      }
      if (librarySuccessTimeoutRef.current) {
        clearTimeout(librarySuccessTimeoutRef.current)
      }
    }
  }, [])

  const showPlannerSuccess = (message: string) => {
    if (plannerSuccessTimeoutRef.current) {
      clearTimeout(plannerSuccessTimeoutRef.current)
    }
    setPlannerSuccess(message)
    plannerSuccessTimeoutRef.current = setTimeout(() => {
      setPlannerSuccess(null)
      plannerSuccessTimeoutRef.current = null
    }, 2000)
  }

  const showLibrarySuccess = (message: string) => {
    if (librarySuccessTimeoutRef.current) {
      clearTimeout(librarySuccessTimeoutRef.current)
    }
    setLibrarySuccess(message)
    librarySuccessTimeoutRef.current = setTimeout(() => {
      setLibrarySuccess(null)
      librarySuccessTimeoutRef.current = null
    }, 2000)
  }

  const addPlannerDay = () => {
    setPlannerDays((prev) => {
      const nextOrder = prev.length + 1
      const newDay = createEmptyPlannerDay(nextOrder)
      setSelectedDayId(newDay.localId)
      return [...prev, newDay]
    })
  }

  const removePlannerDay = (dayId: string) => {
    setPlannerDays((prev) => {
      if (prev.length === 1) return prev
      const filtered = prev.filter((day) => day.localId !== dayId)
      const normalized = normalizePlannerDays(filtered)
      return normalized
    })
  }

  const movePlannerDay = (dayId: string, direction: "up" | "down") => {
    setPlannerDays((prev) => {
      const index = prev.findIndex((day) => day.localId === dayId)
      if (index === -1) return prev
      if (direction === "up" && index === 0) return prev
      if (direction === "down" && index === prev.length - 1) return prev
      const newDays = prev.slice()
      const targetIndex = direction === "up" ? index - 1 : index + 1
      const [currentDay] = newDays.splice(index, 1)
      newDays.splice(targetIndex, 0, currentDay)
      return normalizePlannerDays(newDays)
    })
  }

  const updatePlannerDay = (dayId: string, updates: Partial<Omit<PlannerDay, "localId" | "exercises">>) => {
    setPlannerDays((prev) =>
      prev.map((day) => (day.localId === dayId ? { ...day, ...updates } : day)),
    )
  }

  const addExerciseToPlanner = (exerciseTemplate: ExerciseTemplate, dayId?: string) => {
    const targetDayId = dayId ?? selectedDayId
    const targetDay = plannerDays.find((day) => day.localId === targetDayId)
    setPlannerDays((prev) =>
      prev.map((day) => {
        if (day.localId !== targetDayId) return day
        const nextOrder = day.exercises.length + 1
        const newExercise: PlannerExercise = {
          localId: createLocalId(),
          exerciseTemplateId: exerciseTemplate.id,
          exerciseName: exerciseTemplate.name,
          order: nextOrder,
          sets: 3,
          reps: "12",
          rest: 60,
          weight: "",
          notes: "",
        }
        return {
          ...day,
          exercises: [...day.exercises, newExercise],
        }
      }),
    )

    showPlannerSuccess(
      `“${exerciseTemplate.name}”, ${targetDay ? targetDay.label : "gün"} içerisine eklendi`
    )
  }

  const updatePlannerExercise = (
    dayId: string,
    exerciseId: string,
    field: keyof PlannerExercise,
    value: string | number,
  ) => {
    setPlannerDays((prev) =>
      prev.map((day) => {
        if (day.localId !== dayId) return day
        return {
          ...day,
          exercises: day.exercises.map((exercise) =>
            exercise.localId === exerciseId ? { ...exercise, [field]: value } : exercise,
          ),
        }
      }),
    )
  }

  const removePlannerExercise = (dayId: string, exerciseId: string) => {
    setPlannerDays((prev) =>
      prev.map((day) => {
        if (day.localId !== dayId) return day
        const remaining = day.exercises.filter((exercise) => exercise.localId !== exerciseId)
        return {
          ...day,
          exercises: normalizePlannerExercises(remaining),
        }
      }),
    )
  }

  const openCreateExerciseForm = () => {
    resetExerciseForm()
    setExerciseFormMode('create')
    setIsExerciseFormOpen(true)
  }

  const openEditExerciseForm = (exercise: ExerciseTemplate) => {
    setExerciseForm({
      id: exercise.id,
      name: exercise.name,
      category: exercise.category ?? '',
      equipment: exercise.equipment ?? '',
      difficulty: exercise.difficulty ?? '',
      instructions: exercise.instructions ?? '',
      targetMuscles: (exercise.targetMuscles ?? []).join(', '),
      videoUrl: exercise.videoUrl ?? '',
      tips: exercise.tips ?? '',
      safetyNotes: exercise.safetyNotes ?? '',
      variations: (exercise.variations ?? []).join(', '),
    })
    setExerciseFormMode('edit')
    setLibraryError(null)
    setIsExerciseFormOpen(true)
  }

  const handleExerciseFormChange = (field: keyof ExerciseFormState, value: string) => {
    setExerciseForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSaveExercise = async () => {
    if (!exerciseForm.name.trim()) {
      setLibraryError('Egzersiz adı zorunludur')
      return
    }

    setIsSavingExercise(true)
    setLibraryError(null)
    try {
      const payload = {
        name: exerciseForm.name.trim(),
        category: exerciseForm.category.trim() || null,
        equipment: exerciseForm.equipment.trim() || null,
        difficulty: exerciseForm.difficulty.trim() || null,
        instructions: exerciseForm.instructions.trim() || null,
        videoUrl: exerciseForm.videoUrl.trim() || null,
        targetMuscles: splitInputList(exerciseForm.targetMuscles),
        tips: exerciseForm.tips.trim() || null,
        safetyNotes: exerciseForm.safetyNotes.trim() || null,
        variations: splitInputList(exerciseForm.variations),
      }

      const endpoint = exerciseFormMode === 'edit' && exerciseForm.id
        ? `/api/trainer/exercises/${exerciseForm.id}`
        : '/api/trainer/exercises'
      const method = exerciseFormMode === 'edit' ? 'PUT' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        const message =
          (data?.error as string | undefined) ||
          (exerciseFormMode === 'edit' ? 'Egzersiz güncellenemedi' : 'Egzersiz oluşturulamadı')
        setLibraryError(message)
        return
      }

      await refreshExerciseLibrary()
      setIsExerciseFormOpen(false)
      resetExerciseForm()
      showLibrarySuccess(exerciseFormMode === 'edit' ? 'Egzersiz güncellendi' : 'Egzersiz eklendi')
    } catch (error) {
      console.error('Save exercise error:', error)
      setLibraryError(exerciseFormMode === 'edit' ? 'Egzersiz güncellenemedi' : 'Egzersiz oluşturulamadı')
    } finally {
      setIsSavingExercise(false)
    }
  }

  const handleDeleteExercise = async (exercise: ExerciseTemplate) => {
    const confirmDelete =
      typeof window !== 'undefined'
        ? window.confirm(`“${exercise.name}” egzersizini silmek istediğinize emin misiniz?`)
        : true
    if (!confirmDelete) return

    try {
      setLibraryError(null)
      const response = await fetch(`/api/trainer/exercises/${exercise.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        const message = (data?.error as string | undefined) || 'Egzersiz silinemedi'
        setLibraryError(message)
        return
      }

      await refreshExerciseLibrary()
      showLibrarySuccess('Egzersiz silindi')
    } catch (error) {
      console.error('Delete exercise error:', error)
      setLibraryError('Egzersiz silinemedi')
    }
  }

  const handleDuplicateExercise = async (exercise: ExerciseTemplate) => {
    try {
      setLibraryError(null)
      const response = await fetch(`/api/trainer/exercises/${exercise.id}/duplicate`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        const message = (data?.error as string | undefined) || 'Egzersiz kopyalanamadı'
        setLibraryError(message)
        return
      }

      await refreshExerciseLibrary()
      showLibrarySuccess('Egzersiz kopyalandı')
    } catch (error) {
      console.error('Duplicate exercise error:', error)
      setLibraryError('Egzersiz kopyalanamadı')
    }
  }

  const showExerciseDetails = (exercise: ExerciseTemplate) => {
    setSelectedExercise(exercise)
    setIsExerciseDetailOpen(true)
  }

  const handleSaveTemplate = async () => {
    if (!newProgramName.trim()) return
    if (plannerDays.length === 0) return

    setIsSavingProgram(true)
    setPlannerError(null)
    try {
      const normalizedDays = normalizePlannerDays(plannerDays)
      const payload = {
        name: newProgramName.trim(),
        description: newProgramDescription.trim() || null,
        duration: null,
        difficulty: null,
        muscleGroups: extractMuscleGroups(muscleGroupsInput),
        days: normalizedDays.map((day, dayIndex) => ({
          order: dayIndex + 1,
          label: day.label.trim() || `${dayIndex + 1}. Gün`,
          videoUrl: stringOrNull(day.videoUrl),
          notes: stringOrNull(day.notes),
          exercises: day.exercises.map((exercise, exerciseIndex) => ({
            exerciseTemplateId: exercise.exerciseTemplateId,
            order: exerciseIndex + 1,
            sets: numberOrNull(exercise.sets),
            reps: stringOrNull(exercise.reps) ?? null,
            rest: numberOrNull(exercise.rest),
            weight: stringOrNull(exercise.weight),
            notes: stringOrNull(exercise.notes),
          })),
        })),
      }

      const endpoint = editingTemplateId
        ? `/api/trainer/workout-templates/${editingTemplateId}`
        : "/api/trainer/workout-templates"
      const method = editingTemplateId ? "PUT" : "POST"

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        const message = (data?.error as string | undefined) ??
          (editingTemplateId ? "Program şablonu güncellenemedi" : "Program şablonu oluşturulamadı")
        setPlannerError(message)
        return
      }

      await refreshTemplates()
      setActiveTab("templates")
      resetPlannerForm()
      showPlannerSuccess(editingTemplateId ? "Şablon güncellendi" : "Şablon kaydedildi")
    } catch (error) {
      console.error(editingTemplateId ? "Update template error:" : "Create template error:", error)
      if (!plannerError) {
        setPlannerError(editingTemplateId ? "Program şablonu güncellenemedi" : "Program şablonu oluşturulamadı")
      }
    } finally {
      setIsSavingProgram(false)
    }
  }

  const handleEditTemplate = (template: WorkoutTemplate) => {
    setEditingTemplateId(template.id)
    setNewProgramName(template.name)
    setNewProgramDescription(template.description ?? "")
    setMuscleGroupsInput(template.muscleGroups.join(", "))

    const mappedDays = template.days.length
      ? template.days.map((day) => ({
          localId: createLocalId(),
          order: day.order,
          label: day.label,
          videoUrl: day.videoUrl ?? "",
          notes: day.notes ?? "",
          exercises: day.exercises.map((exercise) => ({
            localId: createLocalId(),
            exerciseTemplateId: exercise.exerciseTemplateId,
            exerciseName: exercise.exerciseTemplate.name,
            order: exercise.order,
            sets: exercise.sets ?? 0,
            reps: exercise.reps ?? "",
            rest: exercise.rest ?? 0,
            weight: exercise.weight ?? "",
            notes: exercise.notes ?? "",
          })),
        }))
      : [createEmptyPlannerDay(1)]

    const normalized = normalizePlannerDays(mappedDays)
    setPlannerDays(normalized)
    setSelectedDayId(normalized[0].localId)
    setActiveTab("planner")
    setPlannerError(null)
    setPlannerSuccess(null)
  }

  const handleDuplicateTemplate = async (templateId: string) => {
    try {
      setTemplateActionId(templateId)
      setTemplatesError(null)
      const response = await fetch(`/api/trainer/workout-templates/${templateId}/duplicate`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Program şablonu kopyalanamadı")
      }

      await refreshTemplates()
    } catch (error) {
      console.error("Duplicate template error:", error)
      setTemplatesError((error as Error).message || "Program şablonu kopyalanamadı")
    } finally {
      setTemplateActionId(null)
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    const confirmDelete =
      typeof window !== "undefined"
        ? window.confirm("Program şablonunu silmek istediğinize emin misiniz?")
        : true
    if (!confirmDelete) return

    try {
      setTemplateActionId(templateId)
      setTemplatesError(null)
      const response = await fetch(`/api/trainer/workout-templates/${templateId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Program şablonu silinemedi")
      }

      if (editingTemplateId === templateId) {
        resetPlannerForm()
        setActiveTab("templates")
      }

      await refreshTemplates()
    } catch (error) {
      console.error("Delete template error:", error)
      setTemplatesError((error as Error).message || "Program şablonu silinemedi")
    } finally {
      setTemplateActionId(null)
    }
  }

  const openNewTemplatePlanner = () => {
    resetPlannerForm()
    setActiveTab("planner")
  }

  return (
    <TrainerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Antrenman Programları</h1>
            <p className="text-muted-foreground">
              Şablonlar oluşturun, gün bazlı planları düzenleyin ve egzersiz kütüphanesini yönetin
            </p>
          </div>
          <div className="flex gap-2">
            <Button className="bg-primary text-primary-foreground" onClick={openNewTemplatePlanner}>
              <Plus className="h-4 w-4 mr-2" />
              Yeni Şablon
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Toplam Program</p>
                  <p className="text-2xl font-bold text-foreground">{totalTemplates}</p>
                </div>
                <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Atama Sayısı</p>
                  <p className="text-2xl font-bold text-foreground">{totalAssignments}</p>
                </div>
                <div className="h-8 w-8 bg-accent/10 rounded-full flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Egzersiz</p>
                  <p className="text-2xl font-bold text-foreground">{totalExercises}</p>
                </div>
                <div className="h-8 w-8 bg-secondary/10 rounded-full flex items-center justify-center">
                  <Dumbbell className="h-4 w-4 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Bu Hafta</p>
                  <p className="text-2xl font-bold text-foreground">
                    {
                      templates.filter((template) => {
                        const created = new Date(template.createdAt)
                        const diff = Date.now() - created.getTime()
                        const sevenDays = 7 * 24 * 60 * 60 * 1000
                        return diff <= sevenDays
                      }).length
                    }
                  </p>
                </div>
                <div className="h-8 w-8 bg-destructive/10 rounded-full flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="templates">Program Şablonları</TabsTrigger>
            <TabsTrigger value="planner">Antrenman Planı</TabsTrigger>
            <TabsTrigger value="library">Egzersiz Kütüphanesi</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Program Şablonları</CardTitle>
              </CardHeader>
              <CardContent>
                {templatesLoading && (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    Program şablonları yükleniyor...
                  </div>
                )}
                {!templatesLoading && templatesError && (
                  <div className="text-center text-sm text-destructive py-8">{templatesError}</div>
                )}
                {!templatesLoading && !templatesError && templates.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    Henüz program şablonu bulunmuyor.
                  </div>
                )}
                {!templatesLoading && !templatesError && templates.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map((template) => (
                      <Card key={template.id} className="border border-border">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base text-foreground">{template.name}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Dumbbell className="h-4 w-4" />
                            {template.days.reduce((sum, day) => sum + day.exercises.length, 0)} egzersiz
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {template.muscleGroups.map((group) => (
                              <Badge key={group} variant="outline" className="text-xs">
                                {group}
                              </Badge>
                            ))}
                          </div>
                          {template.videoUrl && (
                            <a
                              href={template.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <Video className="h-3 w-3" /> Videoyu Aç
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}

                          <div className="space-y-2 pt-2">
                            {template.days.map((day) => (
                              <div key={day.id} className="rounded border border-border/60 p-2">
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  {day.label}
                                </p>
                                {day.videoUrl && (
                                  <a
                                    href={day.videoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline mb-1"
                                  >
                                    <Video className="h-3 w-3" /> Gün Videosu
                                  </a>
                                )}
                                {day.notes && (
                                  <p className="text-xs text-muted-foreground mb-1">{day.notes}</p>
                                )}
                                <ul className="space-y-1">
                                  {day.exercises.map((exercise) => (
                                    <li key={exercise.id} className="flex items-center justify-between text-xs">
                                      <span>{exercise.exerciseTemplate.name}</span>
                                      <span className="text-muted-foreground">
                                        {exercise.sets ?? "-"}x{exercise.reps ?? "-"} ({exercise.rest ?? 0}s)
                                      </span>
                                    </li>
                                  ))}
                                  {day.exercises.length === 0 && (
                                    <li className="text-xs text-muted-foreground">Dinlenme günü</li>
                                  )}
                                </ul>
                              </div>
                            ))}
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-transparent"
                              onClick={() => handleDuplicateTemplate(template.id)}
                              disabled={templateActionId === template.id || templatesLoading}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-transparent"
                              onClick={() => handleEditTemplate(template)}
                              disabled={templatesLoading || isSavingProgram}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-transparent text-destructive hover:text-destructive"
                              onClick={() => handleDeleteTemplate(template.id)}
                              disabled={templateActionId === template.id || templatesLoading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="planner" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Program Bilgileri</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {plannerError && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-sm p-3">
                    {plannerError}
                  </div>
                )}
                {plannerSuccess && (
                  <div className="rounded-md border border-emerald-400/40 bg-emerald-400/10 text-emerald-600 text-sm p-3">
                    {plannerSuccess}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="programName">Program Adı</Label>
                    <Input
                      id="programName"
                      placeholder="Program adını girin"
                      value={newProgramName}
                      onChange={(event) => setNewProgramName(event.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="programDescription">Açıklama</Label>
                  <Textarea
                    id="programDescription"
                    placeholder="Program açıklaması..."
                    value={newProgramDescription}
                    onChange={(event) => setNewProgramDescription(event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="programMuscleGroups">Hedef Kas Grupları</Label>
                  <Input
                    id="programMuscleGroups"
                    placeholder="Kas gruplarını virgülle ayırarak girin"
                    value={muscleGroupsInput}
                    onChange={(event) => setMuscleGroupsInput(event.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="text-foreground">Günler</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Her gün için video, açıklama ve egzersizleri düzenleyin. Egzersiz eklemek için kütüphane
                    sekmesini kullanabilirsiniz.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="bg-transparent" onClick={addPlannerDay}>
                    <Plus className="h-4 w-4 mr-1" />
                    Gün Ekle
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    {plannerDays.map((day, index) => {
                      const exerciseCount = day.exercises.length
                      const isSelected = day.localId === selectedDayId
                      return (
                        <div
                          key={day.localId}
                          className={`rounded-lg border ${isSelected ? "border-primary bg-primary/5" : "border-border bg-background"} p-3 space-y-2`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <p className="font-semibold text-sm">{day.label}</p>
                              <p className="text-xs text-muted-foreground">{exerciseCount} egzersiz</p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => movePlannerDay(day.localId, "up")}
                                disabled={index === 0}
                              >
                                <ChevronUp className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => movePlannerDay(day.localId, "down")}
                                disabled={index === plannerDays.length - 1}
                              >
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <Button
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              className="flex-1"
                              onClick={() => setSelectedDayId(day.localId)}
                            >
                              Düzenle
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => removePlannerDay(day.localId)}
                              disabled={plannerDays.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="lg:col-span-2 space-y-4">
                    {selectedPlannerDay ? (
                      <>
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label>Gün Etiketi</Label>
                              <Input
                                value={selectedPlannerDay.label}
                                onChange={(event) =>
                                  updatePlannerDay(selectedPlannerDay.localId, { label: event.target.value })
                                }
                              />
                            </div>
                            <div>
                              <Label>Gün Videosu</Label>
                              <Input
                                value={selectedPlannerDay.videoUrl}
                                onChange={(event) =>
                                  updatePlannerDay(selectedPlannerDay.localId, { videoUrl: event.target.value })
                                }
                                placeholder="https://"
                              />
                            </div>
                          </div>
                          <div>
                            <Label>Not / Dinlenme Gün açıklaması</Label>
                            <Textarea
                              value={selectedPlannerDay.notes}
                              onChange={(event) =>
                                updatePlannerDay(selectedPlannerDay.localId, { notes: event.target.value })
                              }
                              placeholder="Dinlenme günleri veya gün genel notları için kullanabilirsiniz."
                            />
                          </div>
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-foreground">
                            Egzersizler ({selectedPlannerDay.exercises.length})
                          </h3>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveTab("library")}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Egzersiz Ekle
                          </Button>
                        </div>

                        {selectedPlannerDay.exercises.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                            Henüz egzersiz eklenmemiş. Egzersiz kütüphanesinden ekleyebilir veya gün notu bırakarak
                            dinlenme günü oluşturabilirsiniz.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {selectedPlannerDay.exercises.map((exercise) => (
                              <div key={exercise.localId} className="p-3 border border-border rounded-lg space-y-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-medium text-foreground">{exercise.exerciseName}</h4>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removePlannerExercise(selectedPlannerDay.localId, exercise.localId)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                  <div>
                                    <Label className="text-xs">Set</Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      value={exercise.sets}
                                      onChange={(event) =>
                                        updatePlannerExercise(
                                          selectedPlannerDay.localId,
                                          exercise.localId,
                                          "sets",
                                          Number(event.target.value) || 0,
                                        )
                                      }
                                      className="h-8"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Tekrar</Label>
                                    <Input
                                      value={exercise.reps}
                                      onChange={(event) =>
                                        updatePlannerExercise(
                                          selectedPlannerDay.localId,
                                          exercise.localId,
                                          "reps",
                                          event.target.value,
                                        )
                                      }
                                      className="h-8"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Dinlenme (sn)</Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      value={exercise.rest}
                                      onChange={(event) =>
                                        updatePlannerExercise(
                                          selectedPlannerDay.localId,
                                          exercise.localId,
                                          "rest",
                                          Number(event.target.value) || 0,
                                        )
                                      }
                                      className="h-8"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Ağırlık</Label>
                                    <Input
                                      value={exercise.weight}
                                      onChange={(event) =>
                                        updatePlannerExercise(
                                          selectedPlannerDay.localId,
                                          exercise.localId,
                                          "weight",
                                          event.target.value,
                                        )
                                      }
                                      className="h-8"
                                      placeholder="Opsiyonel"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-xs">Not</Label>
                                  <Textarea
                                    value={exercise.notes}
                                    onChange={(event) =>
                                      updatePlannerExercise(
                                        selectedPlannerDay.localId,
                                        exercise.localId,
                                        "notes",
                                        event.target.value,
                                      )
                                    }
                                    placeholder="Egzersize özel açıklama..."
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                        Gün seçmek için sol taraftaki listeden seçim yapın.
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        className="flex-1 bg-primary text-primary-foreground"
                        onClick={handleSaveTemplate}
                        disabled={
                          isSavingProgram ||
                          !newProgramName.trim() ||
                          plannerDays.length === 0
                        }
                      >
                        {isSavingProgram
                          ? editingTemplateId
                            ? "Güncelleniyor..."
                            : "Kaydediliyor..."
                          : editingTemplateId
                          ? "Şablonu Güncelle"
                          : "Şablonu Kaydet"}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 bg-transparent"
                        onClick={resetPlannerForm}
                        disabled={isSavingProgram}
                      >
                        Temizle
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="library" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex flex-col gap-2">
                    <CardTitle className="text-foreground">Egzersiz Kütüphanesi</CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Gün seç:</span>
                      <Select
                        value={selectedDayId}
                        onValueChange={(value) => setSelectedDayId(value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {plannerDays.map((day) => (
                            <SelectItem key={day.localId} value={day.localId}>
                              {day.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button variant="outline" className="bg-transparent" onClick={openCreateExerciseForm}>
                    <Plus className="h-4 w-4 mr-1" /> Yeni Egzersiz
                  </Button>
                </div>
                {libraryError && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-sm p-3">
                    {libraryError}
                  </div>
                )}
                {librarySuccess && (
                  <div className="rounded-md border border-emerald-400/40 bg-emerald-400/10 text-emerald-600 text-sm p-3">
                    {librarySuccess}
                  </div>
                )}
                {!librarySuccess && plannerSuccess && (
                  <div className="rounded-md border border-emerald-400/40 bg-emerald-400/10 text-emerald-600 text-sm p-3">
                    {plannerSuccess}
                  </div>
                )}
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Egzersiz ara..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Kategori seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {exerciseCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category === "all" ? "Tümü" : category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {exercisesLoading && (
                  <div className="text-center text-sm text-muted-foreground py-6">Egzersizler yükleniyor...</div>
                )}
                {!exercisesLoading && exercisesError && (
                  <div className="text-center text-sm text-destructive py-6">{exercisesError}</div>
                )}
                {!exercisesLoading && !exercisesError && exerciseLibrary.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-6">Egzersiz bulunamadı.</div>
                )}
                {!exercisesLoading && !exercisesError && exerciseLibrary.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredExercises.map((exercise) => (
                      <Card key={exercise.id} className="border border-border">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base text-foreground">{exercise.name}</CardTitle>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleDuplicateExercise(exercise)}
                                title="Çoğalt"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openEditExerciseForm(exercise)}
                                title="Düzenle"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteExercise(exercise)}
                                title="Sil"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-muted-foreground">
                          <p>
                            {exercise.category} • {exercise.equipment}
                          </p>
                          <p className="line-clamp-3">{exercise.instructions}</p>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {exercise.targetMuscles.map((muscle) => (
                              <Badge key={muscle} variant="outline" className="text-xs">
                                {muscle}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 bg-transparent"
                              onClick={() => addExerciseToPlanner(exercise)}
                            >
                              <Plus className="h-4 w-4 mr-1" /> Ekle
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-transparent"
                              onClick={() => showExerciseDetails(exercise)}
                            >
                              Detay
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog
          open={isExerciseFormOpen}
          onOpenChange={(open) => {
            setIsExerciseFormOpen(open)
            if (!open) {
              resetExerciseForm()
              setIsSavingExercise(false)
            }
          }}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {exerciseFormMode === 'edit' ? 'Egzersizi Düzenle' : 'Yeni Egzersiz Ekle'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="exerciseName">Egzersiz Adı</Label>
                  <Input
                    id="exerciseName"
                    value={exerciseForm.name}
                    onChange={(event) => handleExerciseFormChange('name', event.target.value)}
                    placeholder="Egzersiz adını girin"
                  />
                </div>
                <div>
                  <Label htmlFor="exerciseCategory">Kategori</Label>
                  <Input
                    id="exerciseCategory"
                    value={exerciseForm.category}
                    onChange={(event) => handleExerciseFormChange('category', event.target.value)}
                    placeholder="Örn. Göğüs"
                  />
                </div>
                <div>
                  <Label htmlFor="exerciseEquipment">Ekipman</Label>
                  <Input
                    id="exerciseEquipment"
                    value={exerciseForm.equipment}
                    onChange={(event) => handleExerciseFormChange('equipment', event.target.value)}
                    placeholder="Örn. Barbell"
                  />
                </div>
                <div>
                  <Label htmlFor="exerciseDifficulty">Zorluk</Label>
                  <Input
                    id="exerciseDifficulty"
                    value={exerciseForm.difficulty}
                    onChange={(event) => handleExerciseFormChange('difficulty', event.target.value)}
                    placeholder="Başlangıç / Orta / İleri"
                  />
                </div>
                <div>
                  <Label htmlFor="exerciseVideo">Video (opsiyonel)</Label>
                  <Input
                    id="exerciseVideo"
                    value={exerciseForm.videoUrl}
                    onChange={(event) => handleExerciseFormChange('videoUrl', event.target.value)}
                    placeholder="https://"
                  />
                </div>
                <div>
                  <Label htmlFor="exerciseTargetMuscles">Hedef Kas Grupları</Label>
                  <Input
                    id="exerciseTargetMuscles"
                    value={exerciseForm.targetMuscles}
                    onChange={(event) => handleExerciseFormChange('targetMuscles', event.target.value)}
                    placeholder="Kasları virgülle ayırın"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="exerciseInstructions">Talimatlar</Label>
                  <Textarea
                    id="exerciseInstructions"
                    value={exerciseForm.instructions}
                    onChange={(event) => handleExerciseFormChange('instructions', event.target.value)}
                    placeholder="Egzersiz nasıl yapılır?"
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="exerciseTips">İpuçları</Label>
                    <Textarea
                      id="exerciseTips"
                      value={exerciseForm.tips}
                      onChange={(event) => handleExerciseFormChange('tips', event.target.value)}
                      placeholder="Egzersiz için ipuçları"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="exerciseSafety">Güvenlik Notları</Label>
                    <Textarea
                      id="exerciseSafety"
                      value={exerciseForm.safetyNotes}
                      onChange={(event) => handleExerciseFormChange('safetyNotes', event.target.value)}
                      placeholder="Dikkat edilmesi gerekenler"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="exerciseVariations">Varyasyonlar</Label>
                    <Input
                      id="exerciseVariations"
                      value={exerciseForm.variations}
                      onChange={(event) => handleExerciseFormChange('variations', event.target.value)}
                      placeholder="Varyasyonları virgülle ayırın"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1 bg-primary text-primary-foreground"
                  onClick={handleSaveExercise}
                  disabled={isSavingExercise}
                >
                  {isSavingExercise
                    ? exerciseFormMode === 'edit'
                      ? 'Güncelleniyor...'
                      : 'Kaydediliyor...'
                    : exerciseFormMode === 'edit'
                    ? 'Egzersizi Güncelle'
                    : 'Egzersizi Kaydet'}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 bg-transparent"
                  onClick={() => {
                    setIsExerciseFormOpen(false)
                    resetExerciseForm()
                  }}
                  disabled={isSavingExercise}
                >
                  İptal
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isExerciseDetailOpen} onOpenChange={setIsExerciseDetailOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {selectedExercise && (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedExercise.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Kategori</Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedExercise.category || "Belirtilmemiş"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Ekipman</Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedExercise.equipment || "Belirtilmemiş"}
                      </p>
                    </div>
                  </div>

                  {/* Egzersizlere ait video bağlantısı kaldırıldı */}

                  <div>
                    <Label className="text-sm font-medium">Talimatlar</Label>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {selectedExercise.instructions || "Talimat bulunmuyor."}
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Hedef Kas Grupları</Label>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedExercise.targetMuscles.map((muscle) => (
                        <Badge key={muscle} variant="outline" className="text-xs">
                          {muscle}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {selectedExercise.variations.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">Varyasyonlar</Label>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2">
                        {selectedExercise.variations.map((variation, index) => (
                          <li key={index}>{variation}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedExercise.tips && (
                    <div>
                      <Label className="text-sm font-medium">İpuçları</Label>
                      <p className="text-sm text-muted-foreground">{selectedExercise.tips}</p>
                    </div>
                  )}

                  {selectedExercise.safetyNotes && (
                    <div>
                      <Label className="text-sm font-medium">Güvenlik Notları</Label>
                      <p className="text-sm text-muted-foreground">{selectedExercise.safetyNotes}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TrainerLayout>
  )
}
