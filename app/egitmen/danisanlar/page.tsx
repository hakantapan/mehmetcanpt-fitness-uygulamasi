"use client"

import { useCallback, useEffect, useState } from "react"
import { TrainerLayout } from "@/components/trainer-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  Plus,
  Filter,
  Eye,
  TrendingUp,
  Target,
  Activity,
  AlertCircle,
  Clock,
  Dumbbell,
  Apple,
  Pill,
  FileText,
  Trash2,
  ShoppingBag,
} from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import { tr } from "date-fns/locale"

type ClientAssignment = {
  id: string | number
  name: string
  templateId?: string | null
  assignedDate?: string | null
  status?: string | null
}

type ClientSupplement = {
  id: string
  programId: string
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
  price: number | null
}

type ClientQuestion = {
  id: string | number
  question: string
  answer?: string | null
  date?: string | null
  status?: string | null
}

type PtFormSummary = {
  id: string
  updatedAt?: string | null
  workoutLocation?: string | null
  workoutDaysPerWeek?: number | null
  experience?: string | null
}

type PtFormDetails = {
  id: string
  createdAt: string
  updatedAt: string
  healthConditions?: string | null
  injuries?: string | null
  medications?: string | null
  workoutLocation?: string | null
  equipmentAvailable?: string | null
  workoutDaysPerWeek?: number | null
  experience?: string | null
  mealFrequency?: number | null
  dietRestrictions?: string | null
  jobDetails?: string | null
  trainingExpectations?: string | null
  sportHistory?: string | null
  lastTrainingProgram?: string | null
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
  specialRequests?: string | null
  agreedToTerms?: boolean | null
  bodyPhotos: string[]
  equipmentPhotos: string[]
}

type Client = {
  id: string
  name: string
  email: string
  phone?: string | null
  age?: number | null
  gender?: string | null
  joinDate: string
  program?: string | null
  activityLevel?: string | null
  status: string
  progress?: number | null
  currentWeight?: number | null
  targetWeight?: number | null
  startWeight?: number | null
  lastActivity?: string | null
  avatar?: string | null
  notes?: string | null
  paymentStatus?: string | null
  package?: string | null
  packagePrice?: string | number | null
  packageEndDate?: string | null
  assignedWorkout?: ClientAssignment | null
  assignedDiet?: ClientAssignment | null
  assignedSupplements: ClientSupplement[]
  ptForm: PtFormSummary | null
  questions: ClientQuestion[]
  packagePurchaseId?: string | null
  packageStatus?: string | null
}

type ClientsMeta = {
  total: number
  active: number
  inactive: number
  recent: number
  matched: number
  page: number
  pageSize: number
  pages: number
}

type ClientsResponse = {
  clients: Client[]
  meta?: ClientsMeta
}

type WorkoutTemplateSummary = {
  id: string
  name: string
  description?: string | null
  muscleGroups: string[]
  assignedClients?: number
}

type DietTemplateSummary = {
  id: string
  name: string
  description?: string | null
  goal?: string | null
  assignedClients?: number
}

type SupplementTemplateSummary = {
  id: string
  name: string
  category: string | null
  brand: string | null
  defaultDosage: string | null
  defaultTiming: string | null
  timingOptions: string[]
}

type FitnessPackageSummary = {
  id: string
  name: string
  price: number
  currency: string
  durationInDays: number
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [clientsMeta, setClientsMeta] = useState<ClientsMeta>({
    total: 0,
    active: 0,
    inactive: 0,
    recent: 0,
    matched: 0,
    page: 1,
    pageSize,
    pages: 0,
  })
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isAddClientOpen, setIsAddClientOpen] = useState(false)
  const [isClientDetailsOpen, setIsClientDetailsOpen] = useState(false)
  const [isAssignWorkoutOpen, setIsAssignWorkoutOpen] = useState(false)
  const [isAssignDietOpen, setIsAssignDietOpen] = useState(false)
  const [isAssignSupplementOpen, setIsAssignSupplementOpen] = useState(false)
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null)
  const [selectedWorkout, setSelectedWorkout] = useState("")
  const [selectedDiet, setSelectedDiet] = useState("")
  const [selectedSupplement, setSelectedSupplement] = useState("")
  const [supplementDosage, setSupplementDosage] = useState("")
  const [supplementTiming, setSupplementTiming] = useState("")
  const [isAssignPackageOpen, setIsAssignPackageOpen] = useState(false)
  const [selectedPackageId, setSelectedPackageId] = useState("")
  const [fitnessPackages, setFitnessPackages] = useState<FitnessPackageSummary[]>([])
  const [packagesLoading, setPackagesLoading] = useState(false)
  const [packagesError, setPackagesError] = useState<string | null>(null)
  const [assigningPackageId, setAssigningPackageId] = useState<string | null>(null)
  const [workoutTemplates, setWorkoutTemplates] = useState<WorkoutTemplateSummary[]>([])
  const [workoutsLoading, setWorkoutsLoading] = useState(false)
  const [workoutsError, setWorkoutsError] = useState<string | null>(null)
  const [assigningWorkoutId, setAssigningWorkoutId] = useState<string | null>(null)
  const [dietTemplates, setDietTemplates] = useState<DietTemplateSummary[]>([])
  const [dietsLoading, setDietsLoading] = useState(false)
  const [dietsError, setDietsError] = useState<string | null>(null)
  const [assigningDietId, setAssigningDietId] = useState<string | null>(null)
  const [supplementTemplates, setSupplementTemplates] = useState<SupplementTemplateSummary[]>([])
  const [supplementTemplatesLoading, setSupplementTemplatesLoading] = useState(false)
  const [supplementTemplatesError, setSupplementTemplatesError] = useState<string | null>(null)
  const [assigningSupplementId, setAssigningSupplementId] = useState<string | null>(null)
  const [supplementActionError, setSupplementActionError] = useState<string | null>(null)
  const [isViewPtFormOpen, setIsViewPtFormOpen] = useState(false)
  const [ptFormDetails, setPtFormDetails] = useState<PtFormDetails | null>(null)
  const [ptFormLoading, setPtFormLoading] = useState(false)
  const [ptFormError, setPtFormError] = useState<string | null>(null)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1)
      setDebouncedSearch(searchTerm.trim())
    }, 400)

    return () => clearTimeout(timeout)
  }, [searchTerm])

  const normalizeClientSupplements = (value: unknown): ClientSupplement[] => {
    if (!Array.isArray(value)) return []

    return value
      .map((item) => {
        if (!item || typeof item !== 'object') return null
        const entry = item as Record<string, unknown>

        const id =
          typeof entry.id === 'string' && entry.id.trim().length > 0 ? entry.id.trim() : null
        const programId =
          typeof entry.programId === 'string' && entry.programId.trim().length > 0
            ? entry.programId.trim()
            : null
        const templateId =
          typeof entry.templateId === 'string' && entry.templateId.trim().length > 0
            ? entry.templateId.trim()
            : null
        const name =
          typeof entry.name === 'string' && entry.name.trim().length > 0 ? entry.name.trim() : null

        if (!id || !programId || !templateId || !name) return null

        const brand = typeof entry.brand === 'string' ? entry.brand : null
        const category = typeof entry.category === 'string' ? entry.category : null
        const dosage = typeof entry.dosage === 'string' ? entry.dosage : null
        const timing = typeof entry.timing === 'string' ? entry.timing : null
        const defaultDosage = typeof entry.defaultDosage === 'string' ? entry.defaultDosage : null
        const defaultTiming = typeof entry.defaultTiming === 'string' ? entry.defaultTiming : null
        const notes = typeof entry.notes === 'string' ? entry.notes : null
        const price =
          typeof entry.price === 'number' && Number.isFinite(entry.price) ? entry.price : null

        const benefits = Array.isArray(entry.benefits)
          ? entry.benefits
              .filter((benefit): benefit is string => typeof benefit === 'string')
              .map((benefit) => benefit.trim())
              .filter((benefit) => benefit.length > 0)
          : []

        const timingOptions = Array.isArray(entry.timingOptions)
          ? entry.timingOptions
              .filter((option): option is string => typeof option === 'string')
              .map((option) => option.trim())
              .filter((option) => option.length > 0)
          : []

        return {
          id,
          programId,
          templateId,
          name,
          category,
          brand,
          dosage,
          timing,
          defaultDosage,
          defaultTiming,
          benefits,
          timingOptions,
          notes,
          price
        } satisfies ClientSupplement
      })
      .filter((item): item is ClientSupplement => item !== null)
  }

  const fetchClients = useCallback(
    async (pageToLoad: number, signal?: AbortSignal) => {
      try {
        setIsLoading(true)
        setError(null)

        const params = new URLSearchParams()
        params.set('page', pageToLoad.toString())
        params.set('pageSize', pageSize.toString())
        if (debouncedSearch) params.set('search', debouncedSearch)
        if (selectedStatus !== 'all') params.set('status', selectedStatus)

        const response = await fetch(`/api/trainer/clients?${params.toString()}`, {
          signal
        })

        if (!response.ok) {
          throw new Error('Danışanlar alınamadı')
        }

        const data: ClientsResponse = await response.json()
        const normalized = Array.isArray(data.clients)
          ? data.clients.map((client) => ({
              ...client,
              assignedSupplements: normalizeClientSupplements(client.assignedSupplements),
              ptForm: client.ptForm ?? null,
              questions: client.questions ?? []
            }))
          : []

        setClients(normalized)

        if (data.meta) {
          setClientsMeta({
            total: data.meta.total ?? 0,
            active: data.meta.active ?? 0,
            inactive: data.meta.inactive ?? 0,
            recent: data.meta.recent ?? 0,
            matched: data.meta.matched ?? normalized.length,
            page: data.meta.page ?? pageToLoad,
            pageSize: data.meta.pageSize ?? pageSize,
            pages: data.meta.pages ?? 0,
          })

          if (data.meta.page && data.meta.page !== pageToLoad) {
            setPage(data.meta.page)
          }
        } else {
          setClientsMeta((prev) => ({
            ...prev,
            matched: normalized.length,
            page: pageToLoad,
            pageSize,
          }))
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        console.error('Trainer clients load error:', err)
        setError((err as Error).message || 'Bilinmeyen bir hata oluştu')
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false)
        }
      }
    },
    [debouncedSearch, pageSize, selectedStatus]
  )

  const fetchPackages = useCallback(async () => {
    try {
      setPackagesLoading(true)
      setPackagesError(null)

      const response = await fetch('/api/packages')
      if (!response.ok) {
        throw new Error('Paket listesi alınamadı')
      }

      const data = await response.json()
      const list: FitnessPackageSummary[] = Array.isArray(data.packages)
        ? data.packages.map((pkg: any) => ({
            id: String(pkg.id),
            name: typeof pkg.name === 'string' ? pkg.name : 'Paket',
            price: typeof pkg.price === 'number' ? pkg.price : 0,
            currency: typeof pkg.currency === 'string' ? pkg.currency : 'TL',
            durationInDays: typeof pkg.durationInDays === 'number' ? pkg.durationInDays : 0,
          }))
        : []

      setFitnessPackages(list)
    } catch (err) {
      console.error('Trainer packages fetch error:', err)
      setPackagesError((err as Error).message || 'Paket listesi alınamadı')
    } finally {
      setPackagesLoading(false)
    }
  }, [])

  const fetchWorkoutTemplates = useCallback(async () => {
    try {
      setWorkoutsLoading(true)
      setWorkoutsError(null)

      const response = await fetch('/api/trainer/workout-templates')
      if (!response.ok) {
        throw new Error('Program şablonları alınamadı')
      }

      const data = await response.json()
      const templates: WorkoutTemplateSummary[] = Array.isArray(data.templates)
        ? data.templates.map((template: any) => ({
            id: template.id,
            name: template.name,
            description: template.description ?? null,
            muscleGroups: Array.isArray(template.muscleGroups) ? template.muscleGroups : [],
            assignedClients: typeof template.assignedClients === 'number' ? template.assignedClients : 0
          }))
        : []

      setWorkoutTemplates(templates)
    } catch (err) {
      console.error('Trainer workout templates fetch error:', err)
      setWorkoutsError((err as Error).message || 'Program şablonları alınamadı')
    } finally {
      setWorkoutsLoading(false)
    }
  }, [])

  const fetchDietTemplates = useCallback(async () => {
    try {
      setDietsLoading(true)
      setDietsError(null)

      const response = await fetch('/api/trainer/diets')
      if (!response.ok) {
        throw new Error('Diyet şablonları alınamadı')
      }

      const data = await response.json()
      const templates: DietTemplateSummary[] = Array.isArray(data.templates)
        ? data.templates.map((template: any) => ({
            id: template.id,
            name: template.name,
            description: template.description ?? null,
            goal: template.goal ?? null,
            assignedClients:
              typeof template.assignedClients === 'number' ? template.assignedClients : 0,
          }))
        : []

      setDietTemplates(templates)
    } catch (err) {
      console.error('Trainer diet templates fetch error:', err)
      setDietsError((err as Error).message || 'Diyet şablonları alınamadı')
    } finally {
      setDietsLoading(false)
    }
  }, [])

  const fetchSupplementTemplates = useCallback(async () => {
    try {
      setSupplementTemplatesLoading(true)
      setSupplementTemplatesError(null)

      const response = await fetch('/api/trainer/supplements')
      if (!response.ok) {
        throw new Error('Supplement listesi alınamadı')
      }

      const data = await response.json()
      const templates: SupplementTemplateSummary[] = Array.isArray(data.supplements)
        ? data.supplements.map((supplement: any) => ({
            id: String(supplement.id),
            name: typeof supplement.name === 'string' ? supplement.name : 'Şablon',
            category: typeof supplement.category === 'string' ? supplement.category : null,
            brand: typeof supplement.brand === 'string' ? supplement.brand : null,
            defaultDosage:
              typeof supplement.defaultDosage === 'string' ? supplement.defaultDosage : null,
            defaultTiming:
              typeof supplement.defaultTiming === 'string' ? supplement.defaultTiming : null,
            timingOptions: Array.isArray(supplement.timingOptions)
              ? supplement.timingOptions.filter((item: unknown): item is string => typeof item === 'string')
              : []
          }))
        : []

      setSupplementTemplates(templates)
    } catch (err) {
      console.error('Trainer supplements fetch error:', err)
      setSupplementTemplatesError((err as Error).message || 'Supplement listesi alınamadı')
    } finally {
      setSupplementTemplatesLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void fetchClients(page, controller.signal)
    return () => controller.abort()
  }, [page, fetchClients])

  useEffect(() => {
    void fetchPackages()
  }, [fetchPackages])

  useEffect(() => {
    void fetchWorkoutTemplates()
  }, [fetchWorkoutTemplates])

  useEffect(() => {
    void fetchDietTemplates()
  }, [fetchDietTemplates])

  useEffect(() => {
    void fetchSupplementTemplates()
  }, [fetchSupplementTemplates])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-accent text-accent-foreground">Aktif</Badge>
      case "inactive":
        return <Badge variant="outline">Pasif</Badge>
      case "completed":
        return <Badge variant="secondary">Tamamlandı</Badge>
      case "paused":
        return <Badge variant="outline">Durduruldu</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-accent text-accent-foreground">Ödendi</Badge>
      case "pending":
        return <Badge variant="destructive">Bekliyor</Badge>
      case "overdue":
        return <Badge variant="destructive">Gecikmiş</Badge>
      case "unknown":
        return <Badge variant="outline">Bilgi yok</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPtFormBadge = (hasForm: boolean) => {
    if (!hasForm) {
      return <Badge variant="outline">Gönderilmedi</Badge>
    }

    return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Form Alındı</Badge>
  }

  const getWorkoutLocationLabel = (value: string | null | undefined) => {
    if (value === "home") return "Evde"
    if (value === "gym") return "Spor Salonunda"
    return "Belirtilmedi"
  }

  const getEquipmentLabel = (value: string | null | undefined) => {
    if (value === "withEquipment") return "Ekipman mevcut"
    if (value === "withoutEquipment") return "Ekipman yok"
    return "Belirtilmedi"
  }

  const getExperienceLabel = (value: string | null | undefined) => {
    switch (value) {
      case "beginner":
        return "Başlangıç"
      case "intermediate":
        return "Orta"
      case "advanced":
        return "İleri"
      case "expert":
        return "Uzman"
      default:
        return "Belirtilmedi"
    }
  }

  const renderText = (value: string | null | undefined) => {
    if (typeof value === "string" && value.trim().length > 0) {
      return value
    }
    return "Belirtilmedi"
  }

  const assignPackage = async () => {
    if (!selectedClient || !selectedPackageId) return

    try {
      setAssigningPackageId(selectedClient.id)
      setPackagesError(null)

      const response = await fetch(`/api/trainer/clients/${selectedClient.id}/packages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ packageId: selectedPackageId })
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Paket atanamadı')
      }

      const data = await response.json()
      const purchase = data?.purchase
      if (purchase) {
        const status: string | null = purchase.status ?? null
        const paymentStatus =
          status === 'PENDING' ? 'pending' : status === 'ACTIVE' ? 'paid' : 'unknown'

        setClients((prev) =>
          prev.map((client) =>
            client.id === selectedClient.id
              ? {
                  ...client,
                  package: purchase.packageName ?? client.package ?? null,
                  packagePrice: purchase.price ?? client.packagePrice ?? null,
                  packageEndDate: purchase.expiresAt ?? client.packageEndDate ?? null,
                  packagePurchaseId: purchase.id ?? client.packagePurchaseId ?? null,
                  packageStatus: status,
                  paymentStatus,
                }
              : client
          )
        )

        setSelectedClient((prev) =>
          prev && prev.id === selectedClient.id
            ? {
                ...prev,
                package: purchase.packageName ?? prev.package ?? null,
                packagePrice: purchase.price ?? prev.packagePrice ?? null,
                packageEndDate: purchase.expiresAt ?? prev.packageEndDate ?? null,
                packagePurchaseId: purchase.id ?? prev.packagePurchaseId ?? null,
                packageStatus: status,
                paymentStatus,
              }
            : prev
        )
      }

      setIsAssignPackageOpen(false)
      setSelectedPackageId("")
    } catch (err) {
      console.error('Trainer package assign error:', err)
      setPackagesError((err as Error).message || 'Paket atanamadı')
    } finally {
      setAssigningPackageId(null)
    }
  }

  const assignWorkout = async () => {
    if (!selectedClient || !selectedWorkout) return

    try {
      setAssigningWorkoutId(selectedClient.id)
      setWorkoutsError(null)

      const response = await fetch(`/api/trainer/clients/${selectedClient.id}/workouts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ templateId: selectedWorkout })
      })

      if (!response.ok) {
        throw new Error('Program atanamadı')
      }

      const data = await response.json()
      const assignment: ClientAssignment | null = data?.assignment ?? null
      if (assignment) {
        setClients((prev) =>
          prev.map((client) =>
            client.id === selectedClient.id ? { ...client, assignedWorkout: assignment } : client
          )
        )

        setSelectedClient((prev) =>
          prev && prev.id === selectedClient.id ? { ...prev, assignedWorkout: assignment } : prev
        )
      }

      setIsAssignWorkoutOpen(false)
      setSelectedWorkout("")
      void fetchWorkoutTemplates()
    } catch (err) {
      console.error('Workout assignment error:', err)
      setWorkoutsError((err as Error).message || 'Program atanamadı')
    } finally {
      setAssigningWorkoutId(null)
    }
  }

  const assignDiet = async () => {
    if (!selectedClient || !selectedDiet) return

    try {
      setAssigningDietId(selectedClient.id)
      setDietsError(null)

      const response = await fetch(`/api/trainer/clients/${selectedClient.id}/diets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ templateId: selectedDiet })
      })

      if (!response.ok) {
        throw new Error('Diyet atanamadı')
      }

      const data = await response.json()
      const assignment: ClientAssignment | null = data?.assignment ?? null
      if (assignment) {
        setClients((prev) =>
          prev.map((client) =>
            client.id === selectedClient.id ? { ...client, assignedDiet: assignment } : client
          )
        )

        setSelectedClient((prev) =>
          prev && prev.id === selectedClient.id ? { ...prev, assignedDiet: assignment } : prev
        )
      }

      setIsAssignDietOpen(false)
      setSelectedDiet("")
      void fetchDietTemplates()
    } catch (err) {
      console.error('Diet assignment error:', err)
      setDietsError((err as Error).message || 'Diyet atanamadı')
    } finally {
      setAssigningDietId(null)
    }
  }

  const assignSupplement = async () => {
    if (!selectedClient || !selectedSupplement) return

    try {
      setAssigningSupplementId(selectedClient.id)
      setSupplementActionError(null)

      const payload = {
        templateId: selectedSupplement,
        dosage: supplementDosage.trim() || null,
        timing: supplementTiming.trim() || null
      }

      const response = await fetch(`/api/trainer/clients/${selectedClient.id}/supplements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error('Supplement atanamadı')
      }

      const data = await response.json()
      const normalizedSupplements = normalizeClientSupplements(data?.program?.supplements)

      setClients((prev) =>
        prev.map((client) =>
          client.id === selectedClient.id ? { ...client, assignedSupplements: normalizedSupplements } : client
        )
      )

      setSelectedClient((prev) =>
        prev && prev.id === selectedClient.id ? { ...prev, assignedSupplements: normalizedSupplements } : prev
      )

      setIsAssignSupplementOpen(false)
      setSelectedSupplement("")
      setSupplementDosage("")
      setSupplementTiming("")
    } catch (err) {
      console.error('Supplement assignment error:', err)
      setSupplementActionError((err as Error).message || 'Supplement atanamadı')
    } finally {
      setAssigningSupplementId(null)
    }
  }

  const removeSupplement = async (entry: ClientSupplement) => {
    if (!selectedClient) return

    try {
      setAssigningSupplementId(selectedClient.id)
      setSupplementActionError(null)

      const response = await fetch(
        `/api/trainer/clients/${selectedClient.id}/supplements?programId=${encodeURIComponent(entry.programId)}&entryId=${encodeURIComponent(entry.id)}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        throw new Error('Supplement kaldırılamadı')
      }

      const data = await response.json()
      const normalizedSupplements = normalizeClientSupplements(data?.program?.supplements)

      setClients((prev) =>
        prev.map((client) =>
          client.id === selectedClient.id ? { ...client, assignedSupplements: normalizedSupplements } : client
        )
      )

      setSelectedClient((prev) =>
        prev && prev.id === selectedClient.id ? { ...prev, assignedSupplements: normalizedSupplements } : prev
      )
    } catch (err) {
      console.error('Supplement remove error:', err)
      setSupplementActionError((err as Error).message || 'Supplement kaldırılamadı')
    } finally {
      setAssigningSupplementId(null)
    }
  }

  const openPtFormModal = async (client: Client) => {
    setSelectedClient(client)
    setIsViewPtFormOpen(true)
    setPtFormDetails(null)
    setPtFormError(null)
    setPtFormLoading(true)

    try {
      const response = await fetch(`/api/trainer/clients/${client.id}/pt-form`)

      if (!response.ok) {
        if (response.status === 404) {
          setPtFormError('Bu danışanın doldurduğu bir PT formu bulunamadı.')
        } else if (response.status === 403) {
          setPtFormError('Bu danışanın PT formunu görüntüleme yetkiniz yok.')
        } else {
          setPtFormError('PT formu alınamadı.')
        }
        return
      }

      const data = await response.json()
      const details = data?.ptForm
      if (details) {
        setPtFormDetails({
          id: details.id,
          createdAt: details.createdAt,
          updatedAt: details.updatedAt,
          healthConditions: details.healthConditions ?? null,
          injuries: details.injuries ?? null,
          medications: details.medications ?? null,
          workoutLocation: details.workoutLocation ?? null,
          equipmentAvailable: details.equipmentAvailable ?? null,
          workoutDaysPerWeek: details.workoutDaysPerWeek ?? null,
          experience: details.experience ?? null,
          mealFrequency: details.mealFrequency ?? null,
          dietRestrictions: details.dietRestrictions ?? null,
          jobDetails: details.jobDetails ?? null,
          trainingExpectations: details.trainingExpectations ?? null,
          sportHistory: details.sportHistory ?? null,
          lastTrainingProgram: details.lastTrainingProgram ?? null,
          emergencyContactName: details.emergencyContactName ?? null,
          emergencyContactPhone: details.emergencyContactPhone ?? null,
          specialRequests: details.specialRequests ?? null,
          agreedToTerms: typeof details.agreedToTerms === 'boolean' ? details.agreedToTerms : null,
          bodyPhotos: Array.isArray(details.bodyPhotos) ? details.bodyPhotos : [],
          equipmentPhotos: Array.isArray(details.equipmentPhotos) ? details.equipmentPhotos : []
        })
      } else {
        setPtFormError('PT formu bulunamadı.')
      }
    } catch (error) {
      console.error('Trainer PT form modal fetch error:', error)
      setPtFormError('PT formu alınırken bir hata oluştu.')
    } finally {
      setPtFormLoading(false)
    }
  }

  const handleOpenClientDetails = (client: Client) => {
    setSelectedClient(client)
    setIsClientDetailsOpen(true)
  }

  const updateClientStatusLocally = (clientId: string, isActive: boolean) => {
    setClients((prev) =>
      prev.map((client) =>
        client.id === clientId
          ? {
              ...client,
              status: isActive ? 'active' : 'inactive'
            }
          : client
      )
    )

    setSelectedClient((prev) =>
      prev && prev.id === clientId
        ? {
            ...prev,
            status: isActive ? 'active' : 'inactive'
          }
        : prev
    )
  }

  const toggleClientStatus = async (client: Client) => {
    const targetStatus = client.status !== 'active'
    setStatusUpdatingId(client.id)
    try {
      const response = await fetch(`/api/trainer/clients/${client.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: targetStatus })
      })

      if (!response.ok) {
        throw new Error('Durum güncellenemedi')
      }

      const data = await response.json()
      if (data?.client) {
        updateClientStatusLocally(client.id, targetStatus)
        setClientsMeta((prev) => ({
          ...prev,
          active: prev.active + (targetStatus ? 1 : -1),
          inactive: prev.inactive + (targetStatus ? -1 : 1),
        }))
        await fetchClients(page)
      }
    } catch (err) {
      console.error('Client status update error:', err)
    } finally {
      setStatusUpdatingId(null)
    }
  }

  const removeAssignment = async (type: string, id?: number) => {
    if (!selectedClient) return

    if (type === "workout" && selectedClient.assignedWorkout) {
      try {
        setAssigningWorkoutId(selectedClient.id)
        setWorkoutsError(null)

        const programId = String(selectedClient.assignedWorkout.id)
        const response = await fetch(
          `/api/trainer/clients/${selectedClient.id}/workouts?programId=${encodeURIComponent(programId)}`,
          { method: 'DELETE' }
        )

        if (!response.ok) {
          throw new Error('Program kaldırma işlemi başarısız')
        }

        setClients((prev) =>
          prev.map((client) =>
            client.id === selectedClient.id ? { ...client, assignedWorkout: null } : client
          )
        )

        setSelectedClient((prev) =>
          prev && prev.id === selectedClient.id ? { ...prev, assignedWorkout: null } : prev
        )

        void fetchWorkoutTemplates()
      } catch (err) {
        console.error('Workout assignment remove error:', err)
        setWorkoutsError((err as Error).message || 'Program kaldırılamadı')
      } finally {
        setAssigningWorkoutId(null)
      }
      return
    }

    if (type === "diet" && selectedClient.assignedDiet) {
      try {
        setAssigningDietId(selectedClient.id)
        setDietsError(null)

        const dietProgramId = String(selectedClient.assignedDiet.id)
        const response = await fetch(
          `/api/trainer/clients/${selectedClient.id}/diets?programId=${encodeURIComponent(dietProgramId)}`,
          { method: 'DELETE' }
        )

        if (!response.ok) {
          throw new Error('Diyet kaldırma işlemi başarısız')
        }

        setClients((prev) =>
          prev.map((client) =>
            client.id === selectedClient.id ? { ...client, assignedDiet: null } : client
          )
        )

        setSelectedClient((prev) =>
          prev && prev.id === selectedClient.id ? { ...prev, assignedDiet: null } : prev
        )

        setSelectedDiet("")
        void fetchDietTemplates()
      } catch (err) {
        console.error('Diet assignment remove error:', err)
        setDietsError((err as Error).message || 'Diyet kaldırılamadı')
      } finally {
        setAssigningDietId(null)
      }
      return
    }

    if (type === "package" && selectedClient.packagePurchaseId) {
      try {
        setAssigningPackageId(selectedClient.id)
        setPackagesError(null)

        const response = await fetch(
          `/api/trainer/clients/${selectedClient.id}/packages?purchaseId=${encodeURIComponent(selectedClient.packagePurchaseId)}`,
          { method: 'DELETE' }
        )

        if (!response.ok) {
          const data = await response.json().catch(() => null)
          throw new Error(data?.error || 'Paket kaldırılamadı')
        }

        setClients((prev) =>
          prev.map((client) =>
            client.id === selectedClient.id
              ? {
                  ...client,
                  package: null,
                  packagePrice: null,
                  packageEndDate: null,
                  packagePurchaseId: null,
                  packageStatus: null,
                  paymentStatus: 'unknown',
                }
              : client
          )
        )

        setSelectedClient((prev) =>
          prev && prev.id === selectedClient.id
            ? {
                ...prev,
                package: null,
                packagePrice: null,
                packageEndDate: null,
                packagePurchaseId: null,
                packageStatus: null,
                paymentStatus: 'unknown',
              }
            : prev
        )
      } catch (err) {
        console.error('Package assignment remove error:', err)
        setPackagesError((err as Error).message || 'Paket kaldırılamadı')
      } finally {
        setAssigningPackageId(null)
      }
      return
    }

    console.log(`Removing ${type} assignment from client ${selectedClient.id}`, id)
  }

  const answerQuestion = (questionId: number, answer: string) => {
    console.log(`Answering question ${questionId}: ${answer}`)
  }

  const totalActive = clientsMeta.active
  const totalInactive = clientsMeta.inactive
  const recentClients = clientsMeta.recent
  const totalMatched = clientsMeta.matched
  const totalPages = clientsMeta.pages
  const currentPage = clientsMeta.page

  return (
    <TrainerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Danışanlar</h1>
            <p className="text-muted-foreground">Danışanlarınızı yönetin ve ilerlemelerini takip edin</p>
          </div>
          <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Yeni Danışan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Yeni Danışan Ekle</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Ad</Label>
                    <Input id="firstName" placeholder="Ad" />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Soyad</Label>
                    <Input id="lastName" placeholder="Soyad" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">E-posta</Label>
                  <Input id="email" type="email" placeholder="ornek@email.com" />
                </div>
                <div>
                  <Label htmlFor="phone">Telefon</Label>
                  <Input id="phone" placeholder="+90 5XX XXX XX XX" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="age">Yaş</Label>
                    <Input id="age" type="number" placeholder="25" />
                  </div>
                  <div>
                    <Label htmlFor="gender">Cinsiyet</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Erkek</SelectItem>
                        <SelectItem value="female">Kadın</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="program">Program Türü</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Program seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weight-loss">Kilo Verme</SelectItem>
                      <SelectItem value="muscle-gain">Kas Yapımı</SelectItem>
                      <SelectItem value="general-fitness">Genel Fitness</SelectItem>
                      <SelectItem value="strength">Güç Antrenmanı</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="notes">Notlar</Label>
                  <Textarea id="notes" placeholder="Danışan hakkında notlar..." />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button className="flex-1 bg-primary text-primary-foreground">Kaydet</Button>
                  <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setIsAddClientOpen(false)}>
                    İptal
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Danışan ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={selectedStatus}
                onValueChange={(value) => {
                  setSelectedStatus(value)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Durumlar</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Pasif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Toplam Danışan</p>
                  <p className="text-2xl font-bold text-foreground">{clientsMeta.total}</p>
                </div>
                <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Aktif</p>
                  <p className="text-2xl font-bold text-foreground">{totalActive}</p>
                </div>
                <div className="h-8 w-8 bg-accent/10 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pasif</p>
                  <p className="text-2xl font-bold text-foreground">{totalInactive}</p>
                </div>
                <div className="h-8 w-8 bg-secondary/10 rounded-full flex items-center justify-center">
                  <Target className="h-4 w-4 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Son 30 Günde Katılan</p>
                  <p className="text-2xl font-bold text-foreground">{recentClients}</p>
                </div>
                <div className="h-8 w-8 bg-destructive/10 rounded-full flex items-center justify-center">
                  <Clock className="h-4 w-4 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Clients List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Danışan Listesi</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="rounded-lg border border-dashed border-muted-foreground/40 p-6 text-center text-muted-foreground">
                Danışanlar yükleniyor...
              </div>
            ) : error ? (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center text-destructive">
                {error}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-muted-foreground">
                  <span>Toplam {totalMatched} kayıt</span>
                  <span>
                    Sayfa {totalPages > 0 ? Math.min(currentPage, totalPages) : 0} / {totalPages > 0 ? totalPages : 0}
                  </span>
                </div>

                {clients.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-muted-foreground/40 p-6 text-center text-muted-foreground">
                    Danışan bulunamadı.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {clients.map((client) => {
                      const joinedDate = client.joinDate
                        ? format(new Date(client.joinDate), "dd MMM yyyy", { locale: tr })
                        : "–"
                      const lastActivityLabel = client.lastActivity
                        ? formatDistanceToNow(new Date(client.lastActivity), { locale: tr, addSuffix: true })
                        : formatDistanceToNow(new Date(client.joinDate), { locale: tr, addSuffix: true })
                      const packageEndDateLabel = client.packageEndDate
                        ? format(new Date(client.packageEndDate), "dd MMM yyyy", { locale: tr })
                        : null
                      const packagePriceLabel =
                        typeof client.packagePrice === "number"
                          ? `₺${client.packagePrice.toLocaleString("tr-TR")}`
                          : typeof client.packagePrice === "string" && client.packagePrice.trim().length > 0
                          ? client.packagePrice
                          : null
                      const packageStatusLabel = client.packageStatus
                        ? client.packageStatus === "PENDING"
                          ? "Beklemede"
                          : client.packageStatus === "ACTIVE"
                          ? "Aktif"
                          : client.packageStatus
                        : null

                      return (
                        <div key={client.id} className="border border-border rounded-lg p-4">
                          <div className="flex items-start gap-4">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={client.avatar || "/placeholder.svg"} />
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {client.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 space-y-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="font-semibold text-foreground">{client.name}</h3>
                                  <p className="text-sm text-muted-foreground">{client.email}</p>
                                  {client.phone && <p className="text-sm text-muted-foreground">{client.phone}</p>}
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Katılım: {joinedDate} · Son aktivite: {lastActivityLabel}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2">
                                    {getStatusBadge(client.status)}
                                    {getPaymentBadge(client.paymentStatus || "unknown")}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-2 px-0 text-xs text-primary"
                                    onClick={() => toggleClientStatus(client)}
                                    disabled={statusUpdatingId === client.id}
                                  >
                                    {statusUpdatingId === client.id
                                      ? 'Güncelleniyor...'
                                      : client.status === 'active'
                                      ? 'Pasif Yap'
                                      : 'Aktif Yap'}
                                  </Button>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenClientDetails(client)}
                                  className="bg-transparent"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Detay
                                </Button>
                              </div>

                              <div className="bg-muted/50 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-foreground">Aktif Paket</p>
                                    <p className="text-sm text-muted-foreground">{client.package || "Belirtilmedi"}</p>
                                    {packageStatusLabel && (
                                      <p className="text-xs text-muted-foreground">Durum: {packageStatusLabel}</p>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-medium text-foreground">
                                      {packagePriceLabel ?? "—"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {packageEndDateLabel ? `Bitiş: ${packageEndDateLabel}` : "Bitiş tarihi yok"}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-4 gap-2">
                                <Dialog
                                  open={isAssignPackageOpen && selectedClient?.id === client.id}
                                  onOpenChange={(open) => {
                                    setIsAssignPackageOpen(open)
                                    if (open) {
                                      setSelectedClient(client)
                                      setSelectedPackageId("")
                                      setPackagesError(null)
                                      if (fitnessPackages.length === 0 && !packagesLoading) {
                                        void fetchPackages()
                                      }
                                    } else {
                                      setSelectedPackageId("")
                                      setPackagesError(null)
                                    }
                                  }}
                                >
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="bg-secondary/5 border-secondary/20 hover:bg-secondary/10"
                                    >
                                      <ShoppingBag className="h-4 w-4 mr-1" />
                                      Paket
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>{client.name} - Paket Ataması</DialogTitle>
                                      <DialogDescription>
                                        Aktif paketi güncelleyin veya yeni bir paket tanımlayın.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      {client.package && (
                                        <div className="bg-muted/50 rounded-lg p-3">
                                          <div className="flex items-center justify-between">
                                            <div>
                                              <p className="font-medium text-foreground">Mevcut Paket</p>
                                              <p className="text-sm text-muted-foreground">{client.package}</p>
                                              {packageEndDateLabel && (
                                                <p className="text-xs text-muted-foreground">
                                                  Bitiş: {packageEndDateLabel}
                                                </p>
                                              )}
                                            </div>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => removeAssignment("package")}
                                              className="text-destructive hover:text-destructive"
                                              disabled={assigningPackageId === client.id}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                      <div>
                                        <Label>Yeni Paket Seç</Label>
                                        <Select
                                          value={selectedPackageId}
                                          onValueChange={setSelectedPackageId}
                                          disabled={packagesLoading || fitnessPackages.length === 0}
                                        >
                                          <SelectTrigger>
                                            <SelectValue
                                              placeholder={
                                                packagesLoading ? "Paketler yükleniyor..." : "Paket seçin"
                                              }
                                            />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {fitnessPackages.length === 0 ? (
                                              <SelectItem value="__empty" disabled>
                                                {packagesLoading ? "Yükleniyor..." : "Aktif paket bulunamadı"}
                                              </SelectItem>
                                            ) : (
                                              fitnessPackages.map((pkg) => (
                                                <SelectItem key={pkg.id} value={pkg.id}>
                                                  {pkg.name} · {pkg.price.toLocaleString("tr-TR")} {pkg.currency} / {pkg.durationInDays} gün
                                                </SelectItem>
                                              ))
                                            )}
                                          </SelectContent>
                                        </Select>
                                        <div className="flex justify-end">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => void fetchPackages()}
                                            disabled={packagesLoading}
                                          >
                                            Yenile
                                          </Button>
                                        </div>
                                        {packagesError && (
                                          <p className="text-sm text-destructive mt-2">{packagesError}</p>
                                        )}
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          onClick={assignPackage}
                                          className="flex-1 bg-secondary text-secondary-foreground"
                                          disabled={!selectedPackageId || assigningPackageId === client.id}
                                        >
                                          {assigningPackageId === client.id
                                            ? "Atanıyor..."
                                            : client.package
                                            ? "Güncelle"
                                            : "Ata"}
                                        </Button>
                                        <Button
                                          variant="outline"
                                          className="flex-1"
                                          onClick={() => setIsAssignPackageOpen(false)}
                                        >
                                          İptal
                                        </Button>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                <Dialog
                                  open={isAssignWorkoutOpen && selectedClient?.id === client.id}
                                  onOpenChange={(open) => {
                                    setIsAssignWorkoutOpen(open)
                                    setWorkoutsError(null)
                                    if (open) {
                                      setSelectedClient(client)
                                      setSelectedWorkout(client.assignedWorkout?.templateId?.toString() ?? "")
                                      if (workoutTemplates.length === 0 && !workoutsLoading) {
                                        void fetchWorkoutTemplates()
                                      }
                                    } else {
                                      setSelectedWorkout("")
                                    }
                                  }}
                                >
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-primary/5 border-primary/20 hover:bg-primary/10"
                                >
                                  <Dumbbell className="h-4 w-4 mr-1" />
                                  Antrenman
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>{client.name} - Antrenman Programı</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  {client.assignedWorkout && (
                                    <div className="bg-muted/50 rounded-lg p-3">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="font-medium text-foreground">Mevcut Program</p>
                                          <p className="text-sm text-muted-foreground">{client.assignedWorkout.name}</p>
                                        </div>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => removeAssignment("workout")}
                                          className="text-destructive hover:text-destructive"
                                          disabled={assigningWorkoutId === client.id}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                  <div>
                                    <Label>Yeni Program Seç</Label>
                                    <Select
                                      value={selectedWorkout}
                                      onValueChange={setSelectedWorkout}
                                      disabled={workoutsLoading || workoutTemplates.length === 0}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder={workoutsLoading ? "Programlar yükleniyor..." : "Program seçin"} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {workoutTemplates.length === 0 ? (
                                          <SelectItem value="__empty" disabled>
                                            {workoutsLoading ? 'Yükleniyor...' : 'Program şablonu bulunamadı'}
                                          </SelectItem>
                                        ) : (
                                          workoutTemplates.map((workout) => (
                                            <SelectItem key={workout.id} value={workout.id}>
                                              {workout.name}
                                              {typeof workout.assignedClients === 'number' && workout.assignedClients > 0
                                                ? ` - ${workout.assignedClients} danışan`
                                                : ''}
                                            </SelectItem>
                                          ))
                                        )}
                                      </SelectContent>
                                    </Select>
                                    {workoutsError && (
                                      <p className="text-sm text-destructive mt-2">{workoutsError}</p>
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      onClick={assignWorkout}
                                      className="flex-1 bg-primary text-primary-foreground"
                                      disabled={!selectedWorkout || assigningWorkoutId === client.id}
                                    >
                                      {assigningWorkoutId === client.id
                                        ? 'Kaydediliyor...'
                                        : client.assignedWorkout
                                        ? "Değiştir"
                                        : "Ata"}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      onClick={() => setIsAssignWorkoutOpen(false)}
                                      className="flex-1"
                                    >
                                      İptal
                                    </Button>
                                  </div>
                                </div>
                            </DialogContent>
                          </Dialog>

                          <Dialog
                            open={isAssignDietOpen && selectedClient?.id === client.id}
                            onOpenChange={(open) => {
                              setIsAssignDietOpen(open)
                              if (open) {
                                setSelectedClient(client)
                                setSelectedDiet(client.assignedDiet?.templateId?.toString() ?? "")
                                setDietsError(null)
                                if (dietTemplates.length === 0 && !dietsLoading) {
                                  void fetchDietTemplates()
                                }
                              } else {
                                setSelectedDiet("")
                                setDietsError(null)
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-accent/5 border-accent/20 hover:bg-accent/10"
                              >
                                <Apple className="h-4 w-4 mr-1" />
                                Diyet
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>{client.name} - Diyet Programı</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                {client.assignedDiet && (
                                  <div className="bg-muted/50 rounded-lg p-3">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-medium text-foreground">Mevcut Diyet</p>
                                        <p className="text-sm text-muted-foreground">{client.assignedDiet.name}</p>
                                      </div>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => removeAssignment("diet")}
                                        className="text-destructive hover:text-destructive"
                                        disabled={assigningDietId === client.id}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                )}
                                <div>
                                  <Label>Yeni Diyet Seç</Label>
                                  <Select
                                    value={selectedDiet}
                                    onValueChange={setSelectedDiet}
                                    disabled={dietsLoading || dietTemplates.length === 0}
                                  >
                                    <SelectTrigger>
                                      <SelectValue
                                        placeholder={dietsLoading ? "Diyetler yükleniyor..." : "Diyet seçin"}
                                      />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {dietTemplates.length === 0 ? (
                                        <SelectItem value="__empty" disabled>
                                          {dietsLoading ? 'Yükleniyor...' : 'Diyet şablonu bulunamadı'}
                                        </SelectItem>
                                      ) : (
                                        dietTemplates.map((diet) => (
                                          <SelectItem key={diet.id} value={diet.id}>
                                            {diet.name}
                                            {diet.goal ? ` - ${diet.goal}` : ''}
                                            {typeof diet.assignedClients === 'number' && diet.assignedClients > 0
                                              ? ` (${diet.assignedClients} danışan)`
                                              : ''}
                                          </SelectItem>
                                        ))
                                      )}
                                    </SelectContent>
                                  </Select>
                                  {dietsError && <p className="text-sm text-destructive mt-2">{dietsError}</p>}
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={assignDiet}
                                    className="flex-1 bg-primary text-primary-foreground"
                                    disabled={!selectedDiet || assigningDietId === client.id}
                                  >
                                    {assigningDietId === client.id
                                      ? 'Kaydediliyor...'
                                      : client.assignedDiet
                                      ? "Değiştir"
                                      : "Ata"}
                                  </Button>
                                  <Button variant="outline" onClick={() => setIsAssignDietOpen(false)} className="flex-1">
                                    İptal
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Dialog
                            open={isAssignSupplementOpen && selectedClient?.id === client.id}
                            onOpenChange={(open) => {
                              setIsAssignSupplementOpen(open)
                              if (open) {
                                setSelectedClient(client)
                                setSupplementActionError(null)
                                if (!supplementTemplatesLoading && supplementTemplates.length === 0) {
                                  void fetchSupplementTemplates()
                                }
                              } else {
                                setSelectedSupplement("")
                                setSupplementDosage("")
                                setSupplementTiming("")
                                setSupplementActionError(null)
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-secondary/5 border-secondary/20 hover:bg-secondary/10"
                              >
                                <Pill className="h-4 w-4 mr-1" />
                                Supplement
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>{client.name} - Supplement Programı</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                {client.assignedSupplements && client.assignedSupplements.length > 0 && (
                                  <div className="space-y-2">
                                    <p className="font-medium text-foreground">Mevcut Supplementler</p>
                                    {client.assignedSupplements.map((supplement) => (
                                      <div key={supplement.id} className="bg-muted/50 rounded-lg p-3">
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <p className="text-sm font-medium text-foreground">{supplement.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                              {(supplement.dosage ?? supplement.defaultDosage) || 'Dozaj belirtilmedi'}
                                              {' • '}
                                              {(supplement.timing ?? supplement.defaultTiming) || 'Zaman belirtilmedi'}
                                            </p>
                                            {supplement.brand && (
                                              <p className="text-xs text-muted-foreground">{supplement.brand}</p>
                                            )}
                                          </div>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => removeSupplement(supplement)}
                                            className="text-destructive hover:text-destructive"
                                            disabled={assigningSupplementId === client.id}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div>
                                  <Label>Yeni Supplement Ekle</Label>
                                  <Select
                                    value={selectedSupplement}
                                    onValueChange={(value) => {
                                      setSelectedSupplement(value)
                                      const supplement = supplementTemplates.find((s) => s.id === value)
                                      if (supplement) {
                                        setSupplementDosage(supplement.defaultDosage ?? "")
                                        setSupplementTiming(supplement.defaultTiming ?? "")
                                      }
                                    }}
                                    disabled={
                                      supplementTemplatesLoading || supplementTemplates.length === 0
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue
                                        placeholder={
                                          supplementTemplatesLoading ? "Supplementler yükleniyor..." : "Supplement seçin"
                                        }
                                      />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {supplementTemplates.length === 0 ? (
                                        <SelectItem value="__empty" disabled>
                                          {supplementTemplatesLoading
                                            ? 'Yükleniyor...'
                                            : 'Supplement şablonu bulunamadı'}
                                        </SelectItem>
                                      ) : (
                                        supplementTemplates.map((supplement) => (
                                          <SelectItem key={supplement.id} value={supplement.id}>
                                            {supplement.name}
                                            {supplement.brand ? ` - ${supplement.brand}` : ''}
                                          </SelectItem>
                                        ))
                                      )}
                                    </SelectContent>
                                  </Select>
                                  <div className="flex justify-end">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => void fetchSupplementTemplates()}
                                      disabled={supplementTemplatesLoading}
                                    >
                                      Yenile
                                    </Button>
                                  </div>
                                  {supplementTemplatesError && (
                                    <p className="text-sm text-destructive mt-2">{supplementTemplatesError}</p>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label>Dozaj</Label>
                                    <Input
                                      value={supplementDosage}
                                      onChange={(e) => setSupplementDosage(e.target.value)}
                                      placeholder="25g, 1 tablet"
                                    />
                                  </div>
                                  <div>
                                    <Label>Zaman</Label>
                                    <Input
                                      value={supplementTiming}
                                      onChange={(e) => setSupplementTiming(e.target.value)}
                                      placeholder="Sabah, akşam"
                                    />
                                  </div>
                                </div>
                                {supplementActionError && (
                                  <p className="text-sm text-destructive">{supplementActionError}</p>
                                )}
                                <div className="flex gap-2">
                                  <Button
                                    onClick={assignSupplement}
                                    className="flex-1 bg-primary text-primary-foreground"
                                    disabled={
                                      !selectedSupplement ||
                                      assigningSupplementId === client.id ||
                                      supplementTemplates.length === 0
                                    }
                                  >
                                    {assigningSupplementId === client.id
                                      ? 'Kaydediliyor...'
                                      : client.assignedSupplements?.some(
                                          (supplement) => supplement.templateId === selectedSupplement
                                        )
                                      ? "Güncelle"
                                      : "Ata"}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => setIsAssignSupplementOpen(false)}
                                    className="flex-1"
                                  >
                                    İptal
                                  </Button>
                                </div>
                              </div>
                          </DialogContent>
                          </Dialog>
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-amber-50 border-amber-200 hover:bg-amber-100 text-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => openPtFormModal(client)}
                            disabled={!client.ptForm}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            PT Formu
                          </Button>
                        </div>

                        {/* Atanmış Programlar Özeti */}
                        <div className="grid grid-cols-4 gap-2 text-xs">
                          <div className="text-center p-2 bg-primary/5 rounded">
                            <p className="text-muted-foreground">Antrenman</p>
                            <p className="font-medium text-foreground">
                              {client.assignedWorkout ? client.assignedWorkout.name : "Atanmamış"}
                            </p>
                          </div>
                          <div className="text-center p-2 bg-accent/5 rounded">
                            <p className="text-muted-foreground">Diyet</p>
                            <p className="font-medium text-foreground">
                              {client.assignedDiet ? client.assignedDiet.name : "Atanmamış"}
                            </p>
                          </div>
                          <div className="text-center p-2 bg-secondary/5 rounded">
                            <p className="text-muted-foreground">Supplement</p>
                            <p className="font-medium text-foreground">{client.assignedSupplements?.length || 0} adet</p>
                          </div>
                          <div className="text-center p-2 bg-amber-50 rounded border border-amber-100">
                            <p className="text-muted-foreground">PT Formu</p>
                            <div className="flex flex-col items-center gap-1">
                              {getPtFormBadge(!!client.ptForm)}
                              <span className="text-[11px] text-muted-foreground">
                                {client.ptForm?.updatedAt
                                  ? format(new Date(client.ptForm.updatedAt), 'dd MMM yyyy', { locale: tr })
                                  : 'Gönderilmedi'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-4">
                  <p className="text-sm text-muted-foreground">
                    Gösterilen: {clients.length} / {totalMatched}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-transparent"
                      onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage <= 1 || totalPages === 0}
                    >
                      Önceki
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-transparent"
                      onClick={() => setPage((prev) => (totalPages > 0 ? Math.min(prev + 1, totalPages) : prev))}
                      disabled={totalPages === 0 || currentPage >= totalPages}
                    >
                      Sonraki
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Dialog
        open={isClientDetailsOpen}
        onOpenChange={(open) => {
          setIsClientDetailsOpen(open)
          if (!open) {
            setSelectedClient(null)
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          {selectedClient && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedClient.avatar || "/placeholder.svg"} />
                    <AvatarFallback>
                      {selectedClient.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span>{selectedClient.name}</span>
                      {getStatusBadge(selectedClient.status)}
                    </div>
                    <DialogDescription>{selectedClient.email}</DialogDescription>
                  </div>
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Telefon</p>
                    <p className="font-medium text-foreground">{selectedClient.phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Katılım Tarihi</p>
                    <p className="font-medium text-foreground">
                      {selectedClient.joinDate
                        ? format(new Date(selectedClient.joinDate), 'dd MMMM yyyy', { locale: tr })
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Son Aktivite</p>
                    <p className="font-medium text-foreground">
                      {selectedClient.lastActivity
                        ? formatDistanceToNow(new Date(selectedClient.lastActivity), { locale: tr, addSuffix: true })
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">PT Formu</p>
                    <div className="flex items-center gap-2">
                      {getPtFormBadge(!!selectedClient.ptForm)}
                      {selectedClient.ptForm?.updatedAt && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(selectedClient.ptForm.updatedAt), 'dd MMM yyyy', { locale: tr })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Program</p>
                    <p className="font-medium text-foreground">{selectedClient.program || 'Belirtilmedi'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Aktivite Seviyesi</p>
                    <p className="font-medium text-foreground">{selectedClient.activityLevel || 'Belirtilmedi'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Ödeme Durumu</p>
                    <div className="mt-1">{getPaymentBadge(selectedClient.paymentStatus || 'unknown')}</div>
                  </div>
                </div>

                <Button
                  variant={selectedClient.status === 'active' ? 'destructive' : 'default'}
                  onClick={() => toggleClientStatus(selectedClient)}
                  disabled={statusUpdatingId === selectedClient.id}
                >
                  {statusUpdatingId === selectedClient.id
                    ? 'Güncelleniyor...'
                    : selectedClient.status === 'active'
                    ? 'Üyeliği Pasif Yap'
                    : 'Üyeliği Aktif Yap'}
                </Button>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Başlangıç Kilosu</p>
                    <p className="font-medium text-foreground">
                      {selectedClient.startWeight ? `${selectedClient.startWeight} kg` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Güncel Kilo</p>
                    <p className="font-medium text-foreground">
                      {selectedClient.currentWeight ? `${selectedClient.currentWeight} kg` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Hedef Kilo</p>
                    <p className="font-medium text-foreground">
                      {selectedClient.targetWeight ? `${selectedClient.targetWeight} kg` : '—'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-primary/5 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Antrenman Programı</p>
                    <p className="text-sm font-medium text-foreground mt-1">
                      {selectedClient.assignedWorkout?.name || 'Atanmamış'}
                    </p>
                  </div>
                  <div className="bg-accent/5 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Diyet Programı</p>
                    <p className="text-sm font-medium text-foreground mt-1">
                      {selectedClient.assignedDiet?.name || 'Atanmamış'}
                    </p>
                  </div>
                  <div className="bg-secondary/5 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Supplement</p>
                    <p className="text-sm font-medium text-foreground mt-1">
                      {selectedClient.assignedSupplements?.length || 0} adet
                    </p>
                  </div>
                </div>

                {selectedClient.notes && (
                  <div className="bg-muted/40 rounded-lg p-3 text-sm">
                    <p className="text-muted-foreground mb-1">Notlar</p>
                    <p className="text-foreground">{selectedClient.notes}</p>
                  </div>
                )}
              </div>
            </>
          )}
      </DialogContent>
      </Dialog>
      <Dialog
        open={isViewPtFormOpen}
        onOpenChange={(open) => {
          setIsViewPtFormOpen(open)
          if (!open) {
            setPtFormDetails(null)
            setPtFormError(null)
            setPtFormLoading(false)
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedClient ? `${selectedClient.name} - PT Formu` : 'PT Formu'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {ptFormLoading && (
              <div className="rounded-md border border-border p-4 text-sm text-muted-foreground">
                PT formu yükleniyor...
              </div>
            )}

            {!ptFormLoading && ptFormError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                {ptFormError}
              </div>
            )}

            {!ptFormLoading && !ptFormError && ptFormDetails && (
              <div className="space-y-6 text-sm">
                <div className="flex flex-wrap items-center gap-3">
                  {getPtFormBadge(true)}
                  <span className="text-muted-foreground">
                    Güncellendi: {format(new Date(ptFormDetails.updatedAt), 'dd MMM yyyy', { locale: tr })}
                  </span>
                  <span className="text-muted-foreground">
                    Oluşturuldu: {format(new Date(ptFormDetails.createdAt), 'dd MMM yyyy', { locale: tr })}
                  </span>
                  {typeof ptFormDetails.workoutDaysPerWeek === 'number' && (
                    <span className="text-muted-foreground">
                      Haftada {ptFormDetails.workoutDaysPerWeek} gün antrenman
                    </span>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-border/60 p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Antrenman Bilgileri</p>
                    <div className="mt-2 space-y-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Antrenman Lokasyonu</p>
                        <p className="font-medium text-foreground">{getWorkoutLocationLabel(ptFormDetails.workoutLocation ?? null)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Ekipman Durumu</p>
                        <p className="font-medium text-foreground">{getEquipmentLabel(ptFormDetails.equipmentAvailable ?? null)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Deneyim Seviyesi</p>
                        <p className="font-medium text-foreground">{getExperienceLabel(ptFormDetails.experience ?? null)}</p>
                      </div>
                    </div>
                  </div>

                  {(ptFormDetails.healthConditions ||
                    ptFormDetails.injuries ||
                    ptFormDetails.medications) && (
                    <div className="rounded-lg border border-border/60 p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Sağlık Bilgileri</p>
                      <div className="mt-2 space-y-2 text-sm">
                        {ptFormDetails.healthConditions && (
                          <div>
                            <p className="text-muted-foreground">Sağlık Sorunları</p>
                            <p className="font-medium text-foreground">{ptFormDetails.healthConditions}</p>
                          </div>
                        )}
                        {ptFormDetails.injuries && (
                          <div>
                            <p className="text-muted-foreground">Sakatlıklar</p>
                            <p className="font-medium text-foreground">{ptFormDetails.injuries}</p>
                          </div>
                        )}
                        {ptFormDetails.medications && (
                          <div>
                            <p className="text-muted-foreground">İlaç Kullanımı</p>
                            <p className="font-medium text-foreground">{ptFormDetails.medications}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {(ptFormDetails.mealFrequency ||
                  ptFormDetails.dietRestrictions ||
                  ptFormDetails.jobDetails) && (
                  <div className="rounded-lg border border-border/60 p-4 space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Beslenme & Yaşam Tarzı</p>
                    {ptFormDetails.mealFrequency && (
                      <div>
                        <p className="text-muted-foreground">Öğün Sıklığı</p>
                        <p className="font-medium text-foreground">{ptFormDetails.mealFrequency} öğün</p>
                      </div>
                    )}
                    {ptFormDetails.dietRestrictions && (
                      <div>
                        <p className="text-muted-foreground">Beslenme Kısıtlamaları</p>
                        <p className="font-medium text-foreground">{ptFormDetails.dietRestrictions}</p>
                      </div>
                    )}
                    {ptFormDetails.jobDetails && (
                      <div>
                        <p className="text-muted-foreground">Meslek / Günlük Aktivite</p>
                        <p className="font-medium text-foreground">{ptFormDetails.jobDetails}</p>
                      </div>
                    )}
                  </div>
                )}

                {(ptFormDetails.trainingExpectations ||
                  ptFormDetails.sportHistory ||
                  ptFormDetails.lastTrainingProgram) && (
                  <div className="rounded-lg border border-border/60 p-4 space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Antrenman Geçmişi</p>
                    {ptFormDetails.trainingExpectations && (
                      <div>
                        <p className="text-muted-foreground">Beklentiler</p>
                        <p className="font-medium text-foreground">{ptFormDetails.trainingExpectations}</p>
                      </div>
                    )}
                    {ptFormDetails.sportHistory && (
                      <div>
                        <p className="text-muted-foreground">Spor Geçmişi</p>
                        <p className="font-medium text-foreground">{ptFormDetails.sportHistory}</p>
                      </div>
                    )}
                    {ptFormDetails.lastTrainingProgram && (
                      <div>
                        <p className="text-muted-foreground">Son Program</p>
                        <p className="font-medium text-foreground">{ptFormDetails.lastTrainingProgram}</p>
                      </div>
                    )}
                  </div>
                )}

                {(ptFormDetails.emergencyContactName ||
                  ptFormDetails.emergencyContactPhone) && (
                  <div className="rounded-lg border border-border/60 p-4 space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Acil Durum Bilgileri</p>
                    {ptFormDetails.emergencyContactName && (
                      <div>
                        <p className="text-muted-foreground">İsim</p>
                        <p className="font-medium text-foreground">{ptFormDetails.emergencyContactName}</p>
                      </div>
                    )}
                    {ptFormDetails.emergencyContactPhone && (
                      <div>
                        <p className="text-muted-foreground">Telefon</p>
                        <p className="font-medium text-foreground">{ptFormDetails.emergencyContactPhone}</p>
                      </div>
                    )}
                  </div>
                )}

                {ptFormDetails.specialRequests && (
                  <div className="rounded-lg border border-border/60 p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Özel İstekler</p>
                    <p className="mt-2 text-sm text-foreground">{ptFormDetails.specialRequests}</p>
                  </div>
                )}

                {ptFormDetails.bodyPhotos.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Vücut Fotoğrafları</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {ptFormDetails.bodyPhotos.map((src, index) => (
                        <div key={`body-photo-${index}`} className="overflow-hidden rounded-md border">
                          <img src={src} alt={`vücut-${index}`} className="h-32 w-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {ptFormDetails.equipmentPhotos.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Ekipman Fotoğrafları</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {ptFormDetails.equipmentPhotos.map((src, index) => (
                        <div key={`equipment-photo-${index}`} className="overflow-hidden rounded-md border">
                          <img src={src} alt={`ekipman-${index}`} className="h-32 w-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </TrainerLayout>
  )
}
