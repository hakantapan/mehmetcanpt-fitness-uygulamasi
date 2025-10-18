"use client"

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import { TrainerLayout } from "@/components/trainer-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Search,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter,
  Send,
  Calendar,
  Tag,
  Star,
  Reply,
  Archive,
  Copy,
  Plus,
  Trash2,
  Edit,
  Loader2,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { tr } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"

type SupportQuestion = {
  id: string
  subject: string
  category: string
  categoryLabel: string
  priority: string
  priorityLabel: string
  status: string
  statusLabel: string
  question: string
  answer: string | null
  answeredAt: string | null
  createdAt: string
  attachments: unknown[]
  client: {
    id: string
    name: string
    email: string
    avatar: string | null
  }
}

type QuestionStats = {
  total: number
  answered: number
  pending: number
  new: number
}

type QuickReply = {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

type ClientOption = {
  id: string
  name: string
  email: string
}

const STATUS_FILTERS = [
  { value: "all", label: "Tüm Durumlar" },
  { value: "Yeni", label: "Yeni" },
  { value: "Beklemede", label: "Beklemede" },
  { value: "Cevaplanmis", label: "Cevaplanmış" },
  { value: "Arsivlendi", label: "Arşivlendi" },
]

const CATEGORY_FILTERS = [
  { value: "all", label: "Tüm Kategoriler" },
  { value: "Antrenman", label: "Antrenman" },
  { value: "Beslenme", label: "Beslenme" },
  { value: "Supplement", label: "Supplement" },
  { value: "Genel", label: "Genel" },
]

const getStatusBadge = (status: string) => {
  switch (status) {
    case "Yeni":
      return <Badge className="bg-accent text-accent-foreground">Yeni</Badge>
    case "Cevaplanmış":
      return <Badge className="bg-primary text-primary-foreground">Cevaplanmış</Badge>
    case "Beklemede":
      return <Badge variant="secondary">Beklemede</Badge>
    case "Arşivlendi":
      return <Badge variant="outline">Arşivlendi</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case "Yüksek":
      return <Badge variant="destructive">Yüksek</Badge>
    case "Orta":
      return <Badge variant="secondary">Orta</Badge>
    case "Düşük":
      return <Badge variant="outline">Düşük</Badge>
    default:
      return <Badge variant="outline">{priority}</Badge>
  }
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "Antrenman":
      return "🏋️"
    case "Beslenme":
      return "🍎"
    case "Supplement":
      return "💊"
    default:
      return "❓"
  }
}

export default function TrainerQAPage() {
  const [activeTab, setActiveTab] = useState("questions")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [questions, setQuestions] = useState<SupportQuestion[]>([])
  const [stats, setStats] = useState<QuestionStats>({ total: 0, answered: 0, pending: 0, new: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedQuestion, setSelectedQuestion] = useState<SupportQuestion | null>(null)
  const [answerText, setAnswerText] = useState("")
  const [answerLoading, setAnswerLoading] = useState(false)
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([])
  const [quickRepliesLoading, setQuickRepliesLoading] = useState(true)
  const [quickRepliesError, setQuickRepliesError] = useState<string | null>(null)
  const [isQuickReplyModalOpen, setIsQuickReplyModalOpen] = useState(false)
  const [quickReplyModalMode, setQuickReplyModalMode] = useState<"create" | "edit">("create")
  const [quickReplyForm, setQuickReplyForm] = useState({ id: "", title: "", content: "" })
  const [quickReplySaving, setQuickReplySaving] = useState(false)
  const [deleteQuickReplyId, setDeleteQuickReplyId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([])
  const [clientsLoading, setClientsLoading] = useState(true)
  const [clientsError, setClientsError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()
  const [questionForm, setQuestionForm] = useState({
    clientId: "",
    subject: "",
    category: "",
    priority: "Orta",
    question: "",
  })

  const filteredQuestions = useMemo(() => {
    return questions.filter((question) => {
      const matchesSearch =
        question.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        question.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        question.question.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = selectedStatus === "all" || question.status === selectedStatus
      const matchesCategory = selectedCategory === "all" || question.category === selectedCategory
      return matchesSearch && matchesStatus && matchesCategory
    })
  }, [questions, searchTerm, selectedStatus, selectedCategory])

  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/trainer/questions")
      if (!response.ok) {
        throw new Error("Sorular alınamadı")
      }

      const data = await response.json()
      setQuestions(Array.isArray(data.questions) ? data.questions : [])
      setStats(
        data.stats ?? {
          total: 0,
          answered: 0,
          pending: 0,
          new: 0,
        },
      )
    } catch (err) {
      console.error("Trainer questions fetch error:", err)
      setError((err as Error).message || "Sorular alınamadı")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchQuickReplies = useCallback(async () => {
    try {
      setQuickRepliesLoading(true)
      setQuickRepliesError(null)
      const response = await fetch("/api/trainer/quick-replies")
      if (!response.ok) {
        throw new Error("Hızlı yanıtlar alınamadı")
      }
      const data = await response.json()
      setQuickReplies(Array.isArray(data.quickReplies) ? data.quickReplies : [])
    } catch (err) {
      console.error("Trainer quick replies fetch error:", err)
      setQuickRepliesError((err as Error).message || "Hızlı yanıtlar alınamadı")
    } finally {
      setQuickRepliesLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchQuestions()
    void fetchQuickReplies()
  }, [fetchQuestions, fetchQuickReplies])

  const fetchClients = useCallback(async () => {
    try {
      setClientsLoading(true)
      setClientsError(null)
      const response = await fetch("/api/trainer/clients?page=1&pageSize=100&status=active")
      if (!response.ok) {
        throw new Error("Danışan listesi alınamadı")
      }
      const data = await response.json()
      const clients: ClientOption[] = Array.isArray(data.clients)
        ? data.clients.map((client: { id?: string; name?: string; email?: string }) => ({
            id: client.id ?? "",
            name: client.name ?? client.email ?? "Bilinmeyen",
            email: client.email ?? "",
          }))
        : []
      setClientOptions(clients.filter((client) => client.id))
    } catch (err) {
      console.error("Trainer clients for questions fetch error:", err)
      setClientsError((err as Error).message || "Danışan listesi alınamadı")
    } finally {
      setClientsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchClients()
  }, [fetchClients])

  const handleSendAnswer = async () => {
    if (!selectedQuestion || !answerText.trim()) return

    try {
      setAnswerLoading(true)
      const response = await fetch(`/api/trainer/questions/${selectedQuestion.id}/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ answer: answerText.trim() }),
      })

      if (!response.ok) {
        throw new Error("Yanıt gönderilemedi")
      }

      setAnswerText("")
      setSelectedQuestion(null)
      await fetchQuestions()
    } catch (err) {
      console.error("Trainer question answer submit error:", err)
    } finally {
      setAnswerLoading(false)
    }
  }

  const handleCreateQuestion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreateError(null)

    if (!questionForm.clientId) {
      setCreateError("Lütfen danışan seçin.")
      return
    }

    if (!questionForm.subject.trim()) {
      setCreateError("Lütfen konu başlığı girin.")
      return
    }

    if (!questionForm.category) {
      setCreateError("Lütfen kategori seçin.")
      return
    }

    if (!questionForm.priority) {
      setCreateError("Lütfen öncelik seçin.")
      return
    }

    if (!questionForm.question.trim()) {
      setCreateError("Lütfen soru metnini yazın.")
      return
    }

    try {
      setIsCreating(true)
      const response = await fetch("/api/trainer/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: questionForm.clientId,
          subject: questionForm.subject.trim(),
          category: questionForm.category,
          priority: questionForm.priority,
          question: questionForm.question.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        const message = errorData?.error || "Soru gönderilemedi"
        throw new Error(message)
      }

      setQuestionForm({
        clientId: "",
        subject: "",
        category: "",
        priority: "Orta",
        question: "",
      })
      toast({
        title: "Soru gönderildi",
        description: "Danışan adına yeni bir soru oluşturuldu.",
      })
      await fetchQuestions()
      setActiveTab("questions")
    } catch (err) {
      const message = (err as Error).message || "Soru gönderilemedi"
      setCreateError(message)
      toast({
        title: "Soru gönderilemedi",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const formatRelativeTime = (iso: string | null) => {
    if (!iso) return null
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: tr })
  }

  const openCreateQuickReplyModal = () => {
    setQuickReplyModalMode("create")
    setQuickReplyForm({ id: "", title: "", content: "" })
    setIsQuickReplyModalOpen(true)
  }

  const openEditQuickReplyModal = (reply: QuickReply) => {
    setQuickReplyModalMode("edit")
    setQuickReplyForm({ id: reply.id, title: reply.title, content: reply.content })
    setIsQuickReplyModalOpen(true)
  }

  const handleQuickReplySave = async () => {
    if (!quickReplyForm.title.trim() || !quickReplyForm.content.trim()) return

    try {
      setQuickReplySaving(true)
      const payload = {
        id: quickReplyForm.id,
        title: quickReplyForm.title.trim(),
        content: quickReplyForm.content.trim(),
      }

      const response = await fetch("/api/trainer/quick-replies", {
        method: quickReplyModalMode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error("Hızlı yanıt kaydedilemedi")
      }

      setIsQuickReplyModalOpen(false)
      await fetchQuickReplies()
    } catch (err) {
      console.error("Trainer quick reply save error:", err)
    } finally {
      setQuickReplySaving(false)
    }
  }

  const handleQuickReplyDelete = async () => {
    if (!deleteQuickReplyId) return

    try {
      setDeleteLoading(true)
      const response = await fetch(`/api/trainer/quick-replies?id=${encodeURIComponent(deleteQuickReplyId)}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Hızlı yanıt silinemedi")
      }

      setDeleteQuickReplyId(null)
      await fetchQuickReplies()
    } catch (err) {
      console.error("Trainer quick reply delete error:", err)
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleDuplicateQuickReply = async (reply: QuickReply) => {
    try {
      setQuickReplySaving(true)
      const response = await fetch("/api/trainer/quick-replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${reply.title} (Kopya)`,
          content: reply.content,
        }),
      })

      if (!response.ok) {
        throw new Error("Hızlı yanıt kopyalanamadı")
      }

      await fetchQuickReplies()
    } catch (err) {
      console.error("Trainer quick reply duplicate error:", err)
    } finally {
      setQuickReplySaving(false)
    }
  }

  return (
    <TrainerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Soru Cevap Merkezi</h1>
            <p className="text-muted-foreground">Danışanlarınızın sorularını yanıtlayın ve destek sağlayın</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Toplam Soru</p>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                </div>
                <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cevaplanan</p>
                  <p className="text-2xl font-bold text-foreground">{stats.answered}</p>
                </div>
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Bekleyen</p>
                  <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
                </div>
                <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Yeni</p>
                  <p className="text-2xl font-bold text-foreground">{stats.new}</p>
                </div>
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-4">
              <CardTitle className="text-foreground">Sorular</CardTitle>
              <div className="flex flex-col md:flex-row gap-3 md:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Soru ara..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="md:w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Durum seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_FILTERS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="md:w-48">
                    <Tag className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Kategori seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_FILTERS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading && (
                <div className="rounded-md border border-border p-4 text-sm text-muted-foreground">
                  Sorular yükleniyor...
                </div>
              )}
              {!loading && error && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                  {error}
                </div>
              )}
              {!loading && !error && filteredQuestions.length === 0 && (
                <div className="rounded-md border border-border p-6 text-center text-sm text-muted-foreground">
                  Filtrelere uygun soru bulunamadı.
                </div>
              )}
              {!loading &&
                !error &&
                filteredQuestions.map((question) => (
                  <Card key={question.id} className="border border-border/60">
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={question.client.avatar ?? undefined} />
                                <AvatarFallback>{question.client.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-foreground">{question.client.name}</p>
                                <p className="text-xs text-muted-foreground">{formatRelativeTime(question.createdAt)}</p>
                              </div>
                            </div>
                            <p className="text-sm font-medium text-foreground mt-2">{question.subject}</p>
                            <p className="text-sm text-muted-foreground mt-1">{question.question}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex flex-wrap justify-end gap-2">
                              {getCategoryIcon(question.categoryLabel)}
                              {getPriorityBadge(question.priorityLabel)}
                              {getStatusBadge(question.statusLabel)}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatRelativeTime(question.createdAt)}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">{question.categoryLabel}</Badge>
                          <Badge variant="outline">Öncelik: {question.priorityLabel}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedQuestion(question)
                              setAnswerText(question.answer ?? "")
                            }}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Yanıtla
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Archive className="h-4 w-4 mr-1" />
                            Arşivle
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-foreground">Yanıt Paneli</CardTitle>
              <p className="text-sm text-muted-foreground">Seçilen soruya yanıt verin veya hızlı cevaplardan birini seçin</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedQuestion ? (
                <div className="space-y-4">
                  <div className="border border-border/60 rounded-lg p-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={selectedQuestion.client.avatar ?? undefined} />
                        <AvatarFallback>{selectedQuestion.client.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">{selectedQuestion.client.name}</p>
                          {getStatusBadge(selectedQuestion.statusLabel)}
                          <Badge variant="outline">Öncelik: {selectedQuestion.priorityLabel}</Badge>
                          <Badge variant="outline">Kategori: {selectedQuestion.categoryLabel}</Badge>
                        </div>
                        <p className="text-sm font-medium text-foreground">{selectedQuestion.subject}</p>
                        <p className="text-sm text-muted-foreground">{formatRelativeTime(selectedQuestion.createdAt)}</p>
                        <p className="text-sm text-muted-foreground">{selectedQuestion.question}</p>
                        {selectedQuestion.answer && (
                          <div className="mt-3 rounded-md bg-primary/5 border border-primary/10 p-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-primary">
                              <Reply className="h-4 w-4" />
                              Yanıt
                            </div>
                            <p className="text-sm text-primary/80 mt-2">{selectedQuestion.answer}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="answer">Yanıtınız</Label>
                    <Textarea
                      id="answer"
                      placeholder="Soruyu yanıtlayın..."
                      value={answerText}
                      onChange={(event) => setAnswerText(event.target.value)}
                      className="min-h-[160px]"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">Hızlı Yanıtlar</p>
                      <Button variant="ghost" size="sm" onClick={openCreateQuickReplyModal}>
                        <Plus className="h-4 w-4 mr-1" /> Yeni
                      </Button>
                    </div>
                    {quickRepliesLoading ? (
                      <div className="rounded-md border border-border p-3 text-xs text-muted-foreground">
                        Hızlı yanıtlar yükleniyor...
                      </div>
                    ) : quickRepliesError ? (
                      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                        {quickRepliesError}
                      </div>
                    ) : quickReplies.length === 0 ? (
                      <div className="rounded-md border border-dashed border-border/60 p-4 text-xs text-muted-foreground">
                        Henüz hızlı yanıt tanımlamadınız. "Yeni" butonuna tıklayarak ekleyebilirsiniz.
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        {quickReplies.map((reply) => (
                          <Card
                            key={reply.id}
                            className="border border-border/60 cursor-pointer transition hover:border-primary/60"
                            onClick={() => setAnswerText(reply.content)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                  <Star className="h-4 w-4" />
                                  {reply.title}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {formatRelativeTime(reply.updatedAt)}
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{reply.content}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button className="w-full" onClick={handleSendAnswer} disabled={answerLoading}>
                    <Send className="h-4 w-4 mr-2" />
                    {answerLoading ? "Gönderiliyor..." : "Yanıtı Gönder"}
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-border/60 p-6 text-center text-muted-foreground text-sm">
                  Bir soru seçerek yanıtlayabilirsiniz.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-center gap-3">
                <div>
                  <CardTitle className="text-foreground">Sorular ve Yanıtlar</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Danışan sorularının yönetimi ve hızlı erişim sağlayın
                  </p>
                </div>
                <TabsList className="grid grid-cols-2 w-[240px]">
                  <TabsTrigger value="questions">Sorular</TabsTrigger>
                  <TabsTrigger value="quick-replies">Hızlı Yanıtlar</TabsTrigger>
                </TabsList>
              </div>
            </CardHeader>
            <CardContent>
              <TabsContent value="questions" className="space-y-4">
                {!loading && !error && filteredQuestions.length > 0 ? (
                  filteredQuestions.slice(0, 4).map((question) => (
                    <Card key={`mini-${question.id}`} className="border border-border/60">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={question.client.avatar ?? undefined} />
                              <AvatarFallback>{question.client.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-foreground">{question.subject}</p>
                              <p className="text-xs text-muted-foreground">{formatRelativeTime(question.createdAt)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getPriorityBadge(question.priorityLabel)}
                            {getStatusBadge(question.statusLabel)}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-3">{question.question}</p>
                        {question.answer && (
                          <div className="mt-3 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-primary/80">
                            {question.answer}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Gösterilecek soru bulunamadı.</p>
                )}
              </TabsContent>

              <TabsContent value="quick-replies" className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground">Hızlı Yanıtlar</h3>
                  <Button size="sm" onClick={openCreateQuickReplyModal}>
                    <Plus className="h-4 w-4 mr-1" /> Yeni Hızlı Yanıt
                  </Button>
                </div>
                {quickRepliesLoading ? (
                  <div className="rounded-md border border-border p-4 text-sm text-muted-foreground">
                    Hızlı yanıtlar yükleniyor...
                  </div>
                ) : quickRepliesError ? (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                    {quickRepliesError}
                  </div>
                ) : quickReplies.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                    Henüz bir hızlı yanıt oluşturmadınız.
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {quickReplies.map((reply) => (
                      <Card key={`qr-${reply.id}`} className="border border-border/60">
                        <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3">
                          <div>
                            <CardTitle className="text-sm text-foreground flex items-center gap-2">
                              <Star className="h-4 w-4 text-primary" />
                              {reply.title}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatRelativeTime(reply.updatedAt)} güncellendi
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditQuickReplyModal(reply)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDuplicateQuickReply(reply)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteQuickReplyId(reply.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground whitespace-pre-line">{reply.content}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Soru Gönder</CardTitle>
            <p className="text-sm text-muted-foreground">Danışanlarınız adına hızlıca yeni bir soru oluşturun</p>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleCreateQuestion}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="client">Danışan</Label>
                  <Select
                    value={questionForm.clientId}
                    onValueChange={(value) => setQuestionForm((prev) => ({ ...prev, clientId: value }))}
                    disabled={clientsLoading || clientOptions.length === 0}
                  >
                    <SelectTrigger id="client">
                      <SelectValue placeholder={clientsLoading ? "Yükleniyor..." : "Danışan seçin"} />
                    </SelectTrigger>
                    <SelectContent>
                      {clientsLoading ? (
                        <SelectItem value="__loading" disabled>
                          Danışanlar yükleniyor...
                        </SelectItem>
                      ) : clientOptions.length === 0 ? (
                        <SelectItem value="__empty" disabled>
                          Danışan bulunamadı
                        </SelectItem>
                      ) : (
                        clientOptions.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                            {client.email ? ` • ${client.email}` : ""}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {clientsError && <p className="text-xs text-destructive">{clientsError}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Konu Başlığı</Label>
                  <Input
                    id="subject"
                    placeholder="Örn. Antrenman sonrası beslenme"
                    value={questionForm.subject}
                    onChange={(event) =>
                      setQuestionForm((prev) => ({ ...prev, subject: event.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category">Kategori</Label>
                  <Select
                    value={questionForm.category}
                    onValueChange={(value) => setQuestionForm((prev) => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Kategori seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Antrenman">Antrenman</SelectItem>
                      <SelectItem value="Beslenme">Beslenme</SelectItem>
                      <SelectItem value="Supplement">Supplement</SelectItem>
                      <SelectItem value="Genel">Genel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Öncelik</Label>
                  <Select
                    value={questionForm.priority}
                    onValueChange={(value) => setQuestionForm((prev) => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger id="priority">
                      <SelectValue placeholder="Öncelik seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yuksek">Yüksek</SelectItem>
                      <SelectItem value="Orta">Orta</SelectItem>
                      <SelectItem value="Dusuk">Düşük</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="question">Soru</Label>
                <Textarea
                  id="question"
                  placeholder="Danışanın sorduğu soru..."
                  className="min-h-[120px]"
                  value={questionForm.question}
                  onChange={(event) =>
                    setQuestionForm((prev) => ({ ...prev, question: event.target.value }))
                  }
                />
              </div>
              {createError && <p className="text-sm text-destructive">{createError}</p>}
              <div className="flex justify-end">
                <Button type="submit" disabled={isCreating || clientsLoading}>
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Gönderiliyor...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Soruyu Gönder
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      <Dialog
        open={isQuickReplyModalOpen}
        onOpenChange={(open) => {
          setIsQuickReplyModalOpen(open)
          if (!open) {
            setQuickReplyForm({ id: "", title: "", content: "" })
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {quickReplyModalMode === "create" ? "Yeni Hızlı Yanıt" : "Hızlı Yanıtı Düzenle"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quick-reply-title">Başlık</Label>
              <Input
                id="quick-reply-title"
                value={quickReplyForm.title}
                onChange={(event) => setQuickReplyForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Örn. Antrenman Sonrası Beslenme"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-reply-content">İçerik</Label>
              <Textarea
                id="quick-reply-content"
                rows={5}
                value={quickReplyForm.content}
                onChange={(event) => setQuickReplyForm((prev) => ({ ...prev, content: event.target.value }))}
                placeholder="Yanıt metnini yazın"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsQuickReplyModalOpen(false)
                  setQuickReplyForm({ id: "", title: "", content: "" })
                }}
                disabled={quickReplySaving}
              >
                İptal
              </Button>
              <Button type="button" onClick={handleQuickReplySave} disabled={quickReplySaving}>
                {quickReplySaving ? "Kaydediliyor..." : quickReplyModalMode === "create" ? "Ekle" : "Güncelle"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteQuickReplyId !== null} onOpenChange={(open) => !open && setDeleteQuickReplyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hızlı yanıt silinsin mi?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground">
            Bu hızlı yanıt kalıcı olarak silinecek. İşlemi onaylıyor musunuz?
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={handleQuickReplyDelete} disabled={deleteLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteLoading ? "Siliniyor..." : "Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TrainerLayout>
  )
}
