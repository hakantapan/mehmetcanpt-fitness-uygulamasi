"use client"

import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react"
import AdminLayout from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react"
import { formatDistanceToNowStrict } from "date-fns"
import { tr } from "date-fns/locale"

type LogLevel = "INFO" | "WARN" | "ERROR" | "AUDIT"
type LogSource = "auth" | "support" | "trainer" | "scheduler" | "mail" | "subscription"

type AdminLog = {
  id: string
  level: LogLevel
  message: string
  context?: Record<string, unknown> | null
  actorEmail?: string | null
  source?: string | null
  createdAt: string
}

const LEVEL_OPTIONS: { value: "ALL" | LogLevel; label: string }[] = [
  { value: "ALL", label: "Tümü" },
  { value: "INFO", label: "Bilgi" },
  { value: "WARN", label: "Uyarı" },
  { value: "ERROR", label: "Hata" },
  { value: "AUDIT", label: "Denetim" },
]

const SOURCE_OPTIONS: { value: "ALL" | LogSource; label: string }[] = [
  { value: "ALL", label: "Tüm kaynaklar" },
  { value: "auth", label: "Kimlik" },
  { value: "support", label: "Destek" },
  { value: "trainer", label: "Eğitmen" },
  { value: "scheduler", label: "Zamanlayıcı" },
  { value: "mail", label: "Genel Mail" },
  { value: "subscription", label: "Paket" },
]

const levelBadge: Record<LogLevel, { className: string; icon: ComponentType<{ className?: string }> }> = {
  INFO: { className: "bg-blue-100 text-blue-700 border-blue-200", icon: CheckCircle },
  WARN: { className: "bg-amber-100 text-amber-700 border-amber-200", icon: AlertTriangle },
  ERROR: { className: "bg-red-100 text-red-700 border-red-200", icon: ShieldAlert },
  AUDIT: { className: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: ShieldCheck },
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AdminLog[]>([])
  const [levelFilter, setLevelFilter] = useState<"ALL" | LogLevel>("ALL")
  const [sourceFilter, setSourceFilter] = useState<"ALL" | LogSource>("ALL")
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400)
    return () => clearTimeout(timeout)
  }, [searchTerm])

  const loadLogs = useCallback(
    async (cursor?: string) => {
      try {
        cursor ? setLoadingMore(true) : setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        if (levelFilter !== "ALL") params.set("level", levelFilter)
        if (debouncedSearch) params.set("q", debouncedSearch)
        if (sourceFilter !== "ALL") params.set("source", sourceFilter)
        if (cursor) params.set("cursor", cursor)
        params.set("limit", "50")

        const response = await fetch(`/api/admin/logs?${params.toString()}`, {
          cache: "no-store",
        })

        if (!response.ok) {
          const data = await response.json().catch(() => null)
          throw new Error(data?.error || "Loglar yüklenemedi")
        }

        const data = await response.json()
        const items: AdminLog[] = Array.isArray(data.items)
          ? data.items.map((item: any) => ({
              id: item.id,
              level: item.level,
              message: item.message,
              context: item.context ?? null,
              actorEmail: item.actorEmail ?? null,
              source: item.source ?? null,
              createdAt: item.createdAt,
            }))
          : []

        setLogs((previous) => (cursor ? [...previous, ...items] : items))
        setNextCursor(typeof data.nextCursor === "string" ? data.nextCursor : null)
      } catch (err) {
        console.error("Admin logs fetch error:", err)
        setError((err as Error).message || "Loglar yüklenemedi")
        if (!cursor) {
          setLogs([])
          setNextCursor(null)
        }
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [levelFilter, debouncedSearch, sourceFilter],
  )

  useEffect(() => {
    void loadLogs()
  }, [loadLogs])

  const handleLoadMore = () => {
    if (nextCursor) {
      void loadLogs(nextCursor)
    }
  }

  const formattedLogs = useMemo(() => logs, [logs])

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Sistem Logları</h1>
            <p className="text-muted-foreground">Tüm denetim ve sistem loglarını buradan inceleyebilirsiniz.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtreler</CardTitle>
            <CardDescription>Logları seviyesine veya anahtar kelimeye göre filtreleyin.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <Input
                placeholder="Loglarda ara…"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={levelFilter}
                onChange={(event) => setLevelFilter(event.target.value as typeof levelFilter)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {LEVEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value as typeof sourceFilter)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {SOURCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Button variant="outline" onClick={() => void loadLogs()} disabled={loading}>
                Yenile
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Log Kayıtları</CardTitle>
            <CardDescription>Sistem tarafından oluşturulan tüm logların ayrıntılı listesi.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && logs.length === 0 ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={`log-skeleton-${index}`} className="space-y-2 rounded-lg border border-border/70 p-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : formattedLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Görüntülenecek log bulunamadı.</p>
            ) : (
              <div className="space-y-3">
                {formattedLogs.map((log) => {
                  const meta = levelBadge[log.level]
                  const Icon = meta.icon
                  const timeAgo = formatDistanceToNowStrict(new Date(log.createdAt), {
                    addSuffix: true,
                    locale: tr,
                  })

                  return (
                    <div key={log.id} className="space-y-3 rounded-lg border border-border/70 bg-background p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={meta.className}>{log.level}</Badge>
                          <span className="font-medium text-foreground">{log.message}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {timeAgo}
                        </div>
                      </div>
                      <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                        {log.actorEmail ? (
                          <span>
                            <span className="font-medium text-foreground">Aktör:</span> {log.actorEmail}
                          </span>
                        ) : null}
                        {log.source ? (
                          <span>
                            <span className="font-medium text-foreground">Kaynak:</span> {log.source}
                          </span>
                        ) : null}
                      </div>
                      {log.context ? (
                        <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs text-muted-foreground">
                          {JSON.stringify(log.context, null, 2)}
                        </pre>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}

            {nextCursor ? (
              <div className="mt-4 flex justify-center">
                <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore}>
                  {loadingMore ? "Yükleniyor…" : "Daha Fazla"}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
