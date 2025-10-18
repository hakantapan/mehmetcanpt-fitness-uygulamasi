"use client"

import { useEffect, useMemo, useState, type ComponentType } from "react"
import ResponsiveLayout from "@/components/responsive-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Flame,
  Leaf,
  Moon,
  Activity,
  Clock,
  Target,
  CheckCircle2,
} from "lucide-react"

type WarmupExercise = {
  name: string
  duration: number
  description: string
  targetMuscles: string[]
  instructions: string
}

type WarmupRoutine = {
  id: string
  name: string
  icon: string
  duration: number
  difficulty: string
  description: string
  focus: string
  exercises: WarmupExercise[]
}

type ApiResponse = {
  routines: WarmupRoutine[]
}

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  flame: Flame,
  leaf: Leaf,
  moon: Moon,
  activity: Activity,
}

export default function IsinmaPage() {
  const [routines, setRoutines] = useState<WarmupRoutine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("routines")

  useEffect(() => {
    const fetchRoutines = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch("/api/static/warmups", { cache: "no-cache" })
        if (!response.ok) {
          const message = await response.text()
          throw new Error(message || "Rutin verileri alınamadı.")
        }

        const data = (await response.json()) as ApiResponse
        setRoutines(Array.isArray(data.routines) ? data.routines : [])
      } catch (fetchError) {
        console.error("Isınma verileri alınırken hata:", fetchError)
        setError(fetchError instanceof Error ? fetchError.message : "Isınma verileri yüklenemedi.")
      } finally {
        setLoading(false)
      }
    }

    void fetchRoutines()
  }, [])

  const summary = useMemo(() => {
    if (!routines.length) {
      return {
        total: 0,
        totalExercises: 0,
        averageDuration: 0,
        averageExercises: 0,
      }
    }
    const totalDuration = routines.reduce((acc, routine) => acc + routine.duration, 0)
    const totalExercises = routines.reduce((acc, routine) => acc + routine.exercises.length, 0)
    return {
      total: routines.length,
      totalExercises,
      averageDuration: Math.round(totalDuration / routines.length),
      averageExercises: Math.round(totalExercises / routines.length),
    }
  }, [routines])

  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Isınma ve Esneme</h1>
            <p className="text-gray-600">
              Antrenman öncesi ve sonrası için hazır, herkesin erişebileceği rutinler
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="space-y-1 p-4 text-center">
              <div className="text-xs text-gray-500">Toplam Rutin</div>
              <div className="text-2xl font-bold text-red-600">{summary.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-1 p-4 text-center">
              <div className="text-xs text-gray-500">Toplam Egzersiz</div>
              <div className="text-2xl font-bold text-red-600">{summary.totalExercises}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-1 p-4 text-center">
              <div className="text-xs text-gray-500">Ort. Süre</div>
              <div className="text-2xl font-bold text-red-600">{summary.averageDuration} dk</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-1 p-4 text-center">
              <div className="text-xs text-gray-500">Ort. Egzersiz</div>
              <div className="text-2xl font-bold text-red-600">{summary.averageExercises}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="routines">Rutinler</TabsTrigger>
            <TabsTrigger value="exercises">Egzersizler</TabsTrigger>
          </TabsList>

          <TabsContent value="routines" className="space-y-4">
            {loading ? (
              <div className="grid gap-6 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Card key={`routine-skeleton-${index}`}>
                    <CardHeader>
                      <Skeleton className="h-5 w-32" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : error ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-destructive">{error}</CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {routines.map((routine) => {
                  const Icon = iconMap[routine.icon] || Flame
                  return (
                    <Card key={routine.id} className="h-full">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Icon className="h-5 w-5 text-red-600" />
                          {routine.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-gray-600">{routine.description}</p>
                        <div className="flex flex-wrap gap-3 text-sm">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-gray-500" />
                            {routine.duration} dakika
                          </div>
                          <div className="flex items-center gap-1">
                            <Target className="h-4 w-4 text-gray-500" />
                            {routine.focus}
                          </div>
                          <Badge variant="outline">{routine.difficulty}</Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-gray-800">Öne çıkan egzersizler</div>
                          <div className="space-y-2">
                            {routine.exercises.slice(0, 3).map((exercise, index) => (
                              <div key={exercise.name} className="flex items-start gap-3 text-sm">
                                <CheckCircle2 className="mt-1 h-4 w-4 text-red-500" />
                                <div>
                                  <div className="font-medium text-gray-900">{exercise.name}</div>
                                  <div className="text-xs text-gray-500">
                                    {exercise.duration} saniye • {exercise.targetMuscles.join(", ")}
                                  </div>
                                </div>
                              </div>
                            ))}
                            {routine.exercises.length > 3 ? (
                              <div className="text-xs text-gray-500">
                                +{routine.exercises.length - 3} egzersiz daha
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="exercises" className="space-y-4">
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Card key={`exercise-skeleton-${index}`}>
                    <CardHeader>
                      <Skeleton className="h-5 w-40" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-4 w-3/4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : error ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-destructive">{error}</CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {routines.map((routine) => {
                  const Icon = iconMap[routine.icon] || Flame
                  return (
                    <Card key={`${routine.id}-exercises`}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Icon className="h-5 w-5 text-red-600" />
                          {routine.name} Egzersizleri
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {routine.exercises.map((exercise) => (
                          <div key={`${routine.id}-${exercise.name}`} className="space-y-3 rounded-lg border p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="text-base font-semibold text-gray-900">{exercise.name}</div>
                                <div className="text-sm text-gray-600">{exercise.description}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-red-600">
                                  {exercise.duration} saniye
                                </div>
                                <div className="text-xs text-gray-500">Süre</div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="text-xs font-medium uppercase text-gray-500">Hedef Kaslar</div>
                              <div className="flex flex-wrap gap-1">
                                {exercise.targetMuscles.map((muscle) => (
                                  <Badge key={`${exercise.name}-${muscle}`} variant="secondary" className="text-[10px]">
                                    {muscle}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                              <div className="mb-1 text-xs font-semibold uppercase text-gray-500">Nasıl Yapılır?</div>
                              {exercise.instructions}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ResponsiveLayout>
  )
}
