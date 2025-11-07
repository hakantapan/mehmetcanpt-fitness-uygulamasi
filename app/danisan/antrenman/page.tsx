"use client"

import { useEffect, useMemo, useState } from "react"
import ResponsiveLayout from "@/components/responsive-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Dumbbell, Calendar } from "lucide-react"

type ClientProgramExercise = {
  id: string | null
  order: number | null
  sets: number | null
  reps: string | null
  rest: number | null
  weight: string | null
  notes: string | null
  exercise: {
    id: string | null
    name: string | null
    category: string | null
    difficulty: string | null
    videoUrl: string | null
    targetMuscles: string[]
  } | null
}

type ClientProgramDay = {
  id: string | null
  order: number
  label: string | null
  videoUrl: string | null
  notes: string | null
  exercises: ClientProgramExercise[]
}

type ClientProgram = {
  id: string
  title: string
  description: string | null
  assignedAt: string
  templateId: string | null
  duration: number | null
  difficulty: string | null
  muscleGroups: string[]
  days: ClientProgramDay[]
}

const getDayValue = (day: ClientProgramDay) => {
  const order = day.order ?? 0
  return day.id ?? `day-${order}`
}

const extractYouTubeId = (source: string): string | null => {
  try {
    const url = new URL(source)
    if (url.host.includes("youtu.be")) {
      return url.pathname.replace("/", "").split("/")[0] || null
    }
    if (url.pathname.startsWith("/watch")) {
      return url.searchParams.get("v")
    }
    if (url.pathname.includes("/embed/")) {
      return url.pathname.split("/embed/")[1]?.split("/")[0] || null
    }
    if (url.pathname.includes("/shorts/")) {
      return url.pathname.split("/shorts/")[1]?.split("/")[0] || null
    }
    return null
  } catch (_error) {
    return null
  }
}

const buildSimpleYouTubeEmbed = (source: string): string => {
  if (!source) return ""
  const id = extractYouTubeId(source)
  const base = id ? `https://www.youtube.com/embed/${id}` : source
  const [cleanBase, existing] = base.split("?")
  const params = new URLSearchParams(existing ?? "")
  params.set("controls", "0")
  params.set("rel", "0")
  params.set("modestbranding", "1")
  params.set("playsinline", "1")
  params.set("fs", "0")
  params.set("disablekb", "1")
  params.set("iv_load_policy", "3")
  params.set("cc_load_policy", "0")
  return `${cleanBase}?${params.toString()}`
}

export default function ClientWorkoutProgramPage() {
  const [program, setProgram] = useState<ClientProgram | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openDayId, setOpenDayId] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    const fetchProgram = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch("/api/client/workout-program", {
          signal: controller.signal,
        })

        if (response.status === 403) {
          window.location.href = "/paket-satin-al?source=antrenman"
          return
        }

        if (!response.ok) {
          throw new Error("Antrenman programı alınamadı")
        }

        const data = await response.json()
        const payload = data?.program ?? null
        if (payload) {
          setProgram({
            id: payload.id,
            title: payload.title,
            description: payload.description,
            assignedAt: payload.assignedAt,
            templateId: payload.templateId,
            duration: payload.duration,
            difficulty: payload.difficulty,
            muscleGroups: Array.isArray(payload.muscleGroups) ? payload.muscleGroups : [],
            days: Array.isArray(payload.days)
              ? payload.days.map((day: ClientProgramDay, index: number) => ({
                  id: day.id ?? `${payload.id}-day-${index + 1}`,
                  order: typeof day.order === "number" ? day.order : index + 1,
                  label: day.label ?? `${index + 1}. Gün`,
                  videoUrl: day.videoUrl ?? null,
                  notes: day.notes ?? null,
                  exercises: Array.isArray(day.exercises) ? day.exercises : [],
                }))
              : [],
          })
        } else {
          setProgram(null)
        }
      } catch (fetchError) {
        if ((fetchError as Error).name === "AbortError") return
        console.error("Client workout program fetch error:", fetchError)
        setError((fetchError as Error).message || "Bir sorun oluştu")
      } finally {
        setLoading(false)
      }
    }

    fetchProgram()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (program?.days?.length) {
      setOpenDayId(getDayValue(program.days[0]))
    }
  }, [program])

  const days = useMemo(() => program?.days ?? [], [program])

  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 text-muted-foreground text-sm">
              <Dumbbell className="h-4 w-4" />
              Antrenman Programın
            </div>
            <CardTitle className="text-2xl text-foreground">
              {loading ? <Skeleton className="h-8 w-64" /> : program?.title || "Program bulunamadı"}
            </CardTitle>
            {!loading && program?.description && (
              <p className="text-muted-foreground text-sm">{program.description}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && (
              <div className="space-y-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-48 w-full" />
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
                <Dumbbell className="h-5 w-5" />
                Henüz bir antrenman programı atanmamış. Eğitmeninle iletişime geçerek program talep edebilirsin.
              </div>
            )}

            {!loading && !error && program && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {program.muscleGroups.map((group) => (
                    <Badge key={group} variant="outline" className="text-xs">
                      {group}
                    </Badge>
                  ))}
                  <Badge variant="outline" className="text-xs">
                    <Calendar className="mr-1 h-3 w-3" />
                    {new Date(program.assignedAt).toLocaleDateString("tr-TR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </Badge>
                </div>

                {days.length > 0 ? (
                  <div className="space-y-3">
                    {days.map((day, index) => {
                      const value = getDayValue(day)
                      const label = day.label ?? `${day.order ?? index + 1}. Gün`
                      const isOpen = openDayId === value
                      const videoSrc = day.videoUrl ? buildSimpleYouTubeEmbed(day.videoUrl) : null
                      const hasExercises = day.exercises.length > 0

                      return (
                        <div key={value} className="rounded-lg border border-border overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setOpenDayId(isOpen ? null : value)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition"
                          >
                            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                              <Dumbbell className="h-4 w-4" />
                              {label}
                            </span>
                            {isOpen ? <span className="text-xs text-muted-foreground">Gizle</span> : <span className="text-xs text-muted-foreground">Göster</span>}
                          </button>
                          <div className={isOpen ? "block" : "hidden"}>
                            <div className="px-4 py-4 space-y-4">
                              {videoSrc && (
                                <div className="yt-wrapper rounded-lg overflow-hidden border border-border">
                                  <div className="relative pb-[177.78%] sm:pb-[56.25%]">
                                    <div className="absolute inset-0 overflow-hidden">
                                      <iframe
                                        src={videoSrc}
                                        title={label}
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        referrerPolicy="strict-origin-when-cross-origin"
                                        allowFullScreen
                                        className="absolute inset-0 h-full w-full origin-center scale-[1.33]"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}

                              {day.notes && (
                                <div className="rounded-md border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                                  {day.notes}
                                </div>
                              )}

                              {hasExercises ? (
                                <div className="space-y-3">
                                  {day.exercises.map((exercise) => (
                                    <div key={(exercise.id ?? "") + (exercise.order ?? "")}
                                      className="rounded-lg border border-border bg-background p-3"
                                    >
                                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                        <div>
                                          <p className="font-semibold text-foreground">
                                            {exercise.exercise?.name ?? "Egzersiz"}
                                          </p>
                                          {exercise.exercise?.category && (
                                            <p className="text-xs text-muted-foreground">
                                              {exercise.exercise.category}
                                            </p>
                                          )}
                                        </div>
                                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                          {exercise.sets !== null && <span><strong>{exercise.sets}</strong> set</span>}
                                          {exercise.reps && <span><strong>{exercise.reps}</strong> tekrar</span>}
                                          {exercise.rest !== null && <span><strong>{exercise.rest}</strong> sn dinlen</span>}
                                          {exercise.weight && <span><strong>{exercise.weight}</strong></span>}
                                        </div>
                                      </div>
                                      {exercise.notes && (
                                        <p className="mt-2 text-xs text-muted-foreground">{exercise.notes}</p>
                                      )}
                                      {exercise.exercise?.targetMuscles?.length ? (
                                        <div className="mt-3 flex flex-wrap gap-1">
                                          {exercise.exercise.targetMuscles.map((muscle) => (
                                            <Badge key={muscle} variant="outline" className="text-[10px]">
                                              {muscle}
                                            </Badge>
                                          ))}
                                        </div>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                                  Bu gün dinlenme günü.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                    Henüz planlanmış gün bulunmuyor.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ResponsiveLayout>
  )
}
