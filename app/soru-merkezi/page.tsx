"use client"

import { useCallback, useEffect, useMemo, useState, useRef } from "react"
import ResponsiveLayout from "@/components/responsive-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  MessageCircle,
  Phone,
  Mail,
  HelpCircle,
  Send,
  Plus,
  Upload,
  X,
  ImageIcon,
  Tag,
  AlertCircle,
  CheckCircle2,
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
  question: string
  answer: string | null
  answeredAt: string | null
  createdAt: string
  attachments: unknown[]
  trainer: {
    id: string | null
    name: string | null
  } | null
}

const faqCategories = [
  {
    id: "antrenman",
    title: "Antrenman",
    questions: [
      {
        question: "Haftada kaç gün antrenman yapmalıyım?",
        answer:
          "Fitness seviyenize göre değişir. Yeni başlayanlar için haftada 3-4 gün, deneyimli sporcular için 5-6 gün ideal olabilir. Dinlenme günleri kas gelişimi için çok önemlidir.",
      },
      {
        question: "Antrenman öncesi ne kadar süre önce yemek yemeliyim?",
        answer:
          "Büyük öğünler için 2-3 saat, hafif atıştırmalıklar için 30-60 dakika öncesi idealdir. Bu süre sindirim için gereklidir.",
      },
      {
        question: "Ağırlık mı yoksa kardiyo mu daha etkili?",
        answer:
          "Hedeflerinize bağlıdır. Kas yapımı için ağırlık antrenmanı, kalp sağlığı ve yağ yakımı için kardiyo önemlidir. En iyisi ikisini birleştirmektir.",
      },
    ],
  },
  {
    id: "beslenme",
    title: "Beslenme",
    questions: [
      {
        question: "Günde ne kadar protein almalıyım?",
        answer:
          "Vücut ağırlığınızın kg başına 1.6-2.2 gram protein almalısınız. Aktif sporcular için bu miktarı artırın.",
      },
      {
        question: "Antrenman sonrası ne yemeliyim?",
        answer:
          "Antrenman sonrası 30-60 dakika içinde protein ve karbonhidrat kombinasyonu ideal. Örneğin: protein shake + muz.",
      },
      {
        question: "Su ne kadar içmeliyim?",
        answer: "Günde en az 2-3 litre su içmelisiniz. Antrenman günlerinde bu miktarı artırın.",
      },
    ],
  },
  {
    id: "supplement",
    title: "Supplement",
    questions: [
      {
        question: "Hangi supplementleri almalıyım?",
        answer:
          "Temel supplementler: Whey protein, kreatin, multivitamin, omega-3. Kişisel ihtiyaçlarınıza göre PT'nizle görüşün.",
      },
      {
        question: "Kreatin ne zaman alınmalı?",
        answer: "Kreatin zamanlaması önemli değil. Günde 3-5 gram, istediğiniz zaman alabilirsiniz.",
      },
    ],
  },
  {
    id: "teknik",
    title: "Teknik Destek",
    questions: [
      {
        question: "Uygulamada sorun yaşıyorum, ne yapmalıyım?",
        answer: "Önce uygulamayı kapatıp açmayı deneyin. Sorun devam ederse destek ekibimizle iletişime geçin.",
      },
      {
        question: "Verilerim nasıl yedeklenir?",
        answer: "Tüm verileriniz otomatik olarak bulutta yedeklenir. Hesabınızla giriş yaptığınızda erişebilirsiniz.",
      },
    ],
  },
]

const PRIORITY_OPTIONS = [
  { value: "yuksek", label: "Yüksek" },
  { value: "orta", label: "Orta" },
  { value: "dusuk", label: "Düşük" },
]

const CATEGORY_OPTIONS = [
  { value: "antrenman", label: "Antrenman" },
  { value: "beslenme", label: "Beslenme" },
  { value: "supplement", label: "Supplement" },
  { value: "genel", label: "Genel" },
]

const getStatusColor = (status: string) => {
  switch (status) {
    case "Yeni":
      return "bg-blue-100 text-blue-800"
    case "Beklemede":
      return "bg-yellow-100 text-yellow-800"
    case "Cevaplanmis":
      return "bg-green-100 text-green-800"
    case "Arsivlendi":
      return "bg-gray-100 text-gray-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "Yuksek":
      return "bg-red-100 text-red-800"
    case "Orta":
      return "bg-orange-100 text-orange-800"
    case "Dusuk":
      return "bg-green-100 text-green-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

const mapCategoryValue = (value: string) => {
  switch (value) {
    case "antrenman":
      return "Antrenman"
    case "beslenme":
      return "Beslenme"
    case "supplement":
      return "Supplement"
    default:
      return "Genel"
  }
}

const getCategoryBadgeColor = (category: string) => {
  switch (category) {
    case "Antrenman":
      return "bg-[#DC1D24] text-white" // Kırmızı
    case "Beslenme":
      return "bg-green-600 text-white" // Yeşil
    case "Supplement":
      return "bg-orange-600 text-white" // Turuncu
    case "Teknik Destek":
      return "bg-blue-600 text-white" // Mavi
    default:
      return "bg-gray-600 text-white" // Gri
  }
}

export default function SoruMerkeziPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [questions, setQuestions] = useState<SupportQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newTicket, setNewTicket] = useState({
    title: "",
    description: "",
    category: "antrenman",
    priority: "orta",
    files: [] as File[],
  })
  const [submitting, setSubmitting] = useState(false)
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null)
  const { toast } = useToast()
  const previousQuestionsRef = useRef<Map<string, boolean>>(new Map())
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const filteredFAQ = useMemo(() => {
    return faqCategories.flatMap((category) =>
      category.questions
        .filter((q) =>
          selectedCategory === "all" || selectedCategory === category.id
            ? q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
              q.answer.toLowerCase().includes(searchQuery.toLowerCase())
            : false,
        )
        .map((q) => ({ ...q, category: category.title })),
    )
  }, [selectedCategory, searchQuery])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const validFiles = files.filter((file) => {
      const isValidType = file.type.startsWith("image/") || file.type === "application/pdf"
      const isValidSize = file.size <= 10 * 1024 * 1024
      return isValidType && isValidSize
    })

    setNewTicket((prev) => ({
      ...prev,
      files: [...prev.files, ...validFiles],
    }))
  }

  const removeFile = (index: number) => {
    setNewTicket((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const fetchQuestions = useCallback(async (showNotifications = true, isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true)
      }
      setError(null)
      const response = await fetch("/api/client/questions")
      if (!response.ok) {
        throw new Error("Sorular alınamadı")
      }

      const data = await response.json()
      const newQuestions = Array.isArray(data.questions) ? data.questions : []
      
      // Yeni yanıtları kontrol et
      if (showNotifications && previousQuestionsRef.current.size > 0) {
        newQuestions.forEach((question: SupportQuestion) => {
          const previousHadAnswer = previousQuestionsRef.current.get(question.id) ?? false
          const nowHasAnswer = !!question.answer
          
          // Eğer önceki durumda yanıt yoktu ama şimdi varsa, bildirim göster
          if (!previousHadAnswer && nowHasAnswer) {
            toast({
              title: "Yanıtlandı!",
              description: `"${question.subject}" sorunuza yanıt geldi.`,
              variant: "default",
            })
          }
        })
      }
      
      // Mevcut durumu kaydet
      const answeredMap = new Map<string, boolean>()
      newQuestions.forEach((question: SupportQuestion) => {
        answeredMap.set(question.id, !!question.answer)
      })
      previousQuestionsRef.current = answeredMap
      
      setQuestions(newQuestions)
    } catch (err) {
      console.error("Client questions fetch error:", err)
      setError((err as Error).message || "Sorular alınamadı")
    } finally {
      if (isInitialLoad) {
        setLoading(false)
      }
    }
  }, [toast])

  useEffect(() => {
    void fetchQuestions(false, true) // İlk yüklemede bildirim gösterme
    
    // Her 30 saniyede bir kontrol et
    pollingIntervalRef.current = setInterval(() => {
      void fetchQuestions(true, false)
    }, 30000)
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [fetchQuestions])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!newTicket.title.trim() || !newTicket.description.trim()) {
      setSubmissionMessage("Lütfen konu ve açıklama alanlarını doldurun.")
      return
    }

    try {
      setSubmitting(true)
      setSubmissionMessage(null)

      const attachments =
        newTicket.files.length > 0
          ? await Promise.all(
              newTicket.files.map(
                (file) =>
                  new Promise<{ name: string; type: string; data: string }>((resolve, reject) => {
                    const reader = new FileReader()
                    reader.onload = () => {
                      resolve({
                        name: file.name,
                        type: file.type,
                        data: reader.result as string,
                      })
                    }
                    reader.onerror = reject
                    reader.readAsDataURL(file)
                  }),
              ),
            )
          : []

      const response = await fetch("/api/client/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: newTicket.title.trim(),
          question: newTicket.description.trim(),
          category: newTicket.category,
          priority: newTicket.priority,
          attachments,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error ?? "Destek talebi oluşturulamadı")
      }

      setSubmissionMessage("Destek talebiniz başarıyla oluşturuldu. En kısa sürede yanıtlanacaktır.")
      setNewTicket({
        title: "",
        description: "",
        category: "antrenman",
        priority: "orta",
        files: [],
      })
      await fetchQuestions(false, false)
    } catch (err) {
      console.error("Client question create error:", err)
      setSubmissionMessage((err as Error).message || "Destek talebi gönderilemedi.")
    } finally {
      setSubmitting(false)
    }
  }

  const formatRelativeTime = (iso: string | null) => {
    if (!iso) return null
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: tr })
  }

  // Yanıtlanmış soru sayısını hesapla
  const answeredCount = useMemo(() => {
    return questions.filter((q) => q.answer && q.status === "Cevaplanmis").length
  }, [questions])

  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Soru Merkezi</h1>
          <p className="text-gray-600">Sorularınızın cevaplarını bulun veya destek talebi oluşturun</p>
        </div>

        <Tabs defaultValue="faq" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="faq">Sık Sorulan Sorular</TabsTrigger>
            <TabsTrigger value="tickets" className="relative">
              Destek Taleplerim
              {answeredCount > 0 && (
                <Badge className="ml-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {answeredCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="contact">İletişim</TabsTrigger>
          </TabsList>

          <TabsContent value="faq" className="space-y-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Sorularınızı arayın..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant={selectedCategory === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory("all")}
                    >
                      Tümü
                    </Button>
                    {faqCategories.map((category) => (
                      <Button
                        key={category.id}
                        variant={selectedCategory === category.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCategory(category.id)}
                      >
                        {category.title}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  Sık Sorulan Sorular
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredFAQ.length > 0 ? (
                  <Accordion type="single" collapsible className="space-y-2">
                    {filteredFAQ.map((item, index) => (
                      <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg px-4">
                        <AccordionTrigger className="text-left">
                          <div>
                            <div className="font-medium">{item.question}</div>
                            <Badge className={`mt-1 ${getCategoryBadgeColor(item.category)}`}>
                              {item.category}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-gray-600 pb-4">{item.answer}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <HelpCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Aradığınız kriterlere uygun soru bulunamadı.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tickets" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Yeni Destek Talebi Oluştur
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Antrenörünüze veya destek ekibimize sorularınızı iletin. En kısa sürede yanıtlanacaktır.
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Konu</label>
                    <Input
                      placeholder="Sorununuzu kısaca özetleyin"
                      value={newTicket.title}
                      onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Kategori</label>
                    <Select
                      value={newTicket.category}
                      onValueChange={(value) => setNewTicket((prev) => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <Tag className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Kategori seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Öncelik</label>
                    <Select
                      value={newTicket.priority}
                      onValueChange={(value) => setNewTicket((prev) => ({ ...prev, priority: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Öncelik seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Açıklama</label>
                    <Textarea
                      placeholder="Sorununuzu detaylı olarak açıklayın"
                      value={newTicket.description}
                      onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                      rows={4}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Ekler (Opsiyonel)</label>
                    <div className="space-y-3">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-red-400 transition-colors">
                        <input
                          type="file"
                          multiple
                          accept="image/*,.pdf"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="file-upload"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer text-sm text-gray-600 flex flex-col items-center gap-2">
                          <Upload className="w-5 h-5 text-gray-400" />
                          <span>Dosyalarınızı buraya sürükleyin veya yüklemek için tıklayın</span>
                          <span className="text-xs text-gray-500">Desteklenen formatlar: JPG, PNG, PDF (max 10MB)</span>
                        </label>
                      </div>

                      {newTicket.files.length > 0 && (
                        <div className="space-y-2">
                          {newTicket.files.map((file, index) => (
                            <div
                              key={`${file.name}-${index}`}
                              className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-gray-500" />
                                <div>
                                  <p className="font-medium text-gray-700">{file.name}</p>
                                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => removeFile(index)}
                                className="text-gray-500 hover:text-red-500"
                                type="button"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {submissionMessage && (
                    <div className="flex items-center gap-2 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
                      <AlertCircle className="h-4 w-4" />
                      {submissionMessage}
                    </div>
                  )}

                  <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                    <Send className="w-4 h-4 mr-2" />
                    {submitting ? "Gönderiliyor..." : "Destek Talebi Gönder"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Taleplerim
                  </div>
                  {answeredCount > 0 && (
                    <Badge className="bg-green-500 text-white flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {answeredCount} Yanıtlandı
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading && (
                  <div className="rounded-md border border-gray-200 p-4 text-sm text-gray-500">Talepler yükleniyor...</div>
                )}
                {!loading && error && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>
                )}
                {!loading && !error && questions.length === 0 && (
                  <div className="rounded-md border border-gray-200 p-6 text-center text-sm text-gray-500">
                    Henüz destek talebi oluşturmadınız. Yukarıdaki formu kullanarak ilk sorunuzu iletebilirsiniz.
                  </div>
                )}
                {!loading &&
                  !error &&
                  questions.map((ticket) => (
                    <Card key={ticket.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div>
                            <p className="font-semibold text-gray-900">{ticket.subject}</p>
                            <p className="text-sm text-gray-500">
                              {formatRelativeTime(ticket.createdAt)}
                              {ticket.trainer?.name ? ` · ${ticket.trainer.name}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                              {ticket.status === "Yeni"
                                ? "Yeni"
                                : ticket.status === "Beklemede"
                                ? "Beklemede"
                                : ticket.status === "Cevaplanmis"
                                ? "Cevaplanmış"
                                : "Arşivlendi"}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}
                            >
                              {ticket.priorityLabel}
                            </span>
                          </div>
                        </div>
                        <p className="mt-3 text-sm text-gray-600">{ticket.question}</p>
                        {ticket.answer && (
                          <div className="mt-3 rounded-md bg-green-50 border border-green-100 p-3">
                            <p className="text-sm font-medium text-green-700">Yanıt</p>
                            <p className="text-sm text-green-700/80 mt-1">{ticket.answer}</p>
                            <p className="text-xs text-green-600 mt-2">
                              {ticket.answeredAt ? `Yanıtlanma: ${formatRelativeTime(ticket.answeredAt)}` : ""}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-gray-900">Destek Ekibi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  Sorularınız mı var? Canlı destek haftanın 6 günü 09:00 - 22:00 arası hizmet vermektedir.
                  Ayrıca aşağıdaki iletişim kanallarından bize ulaşabilirsiniz.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border border-gray-200">
                    <CardContent className="flex items-center gap-4 py-4">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Phone className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Telefon Destek</p>
                        <p className="text-sm text-gray-600">+90 (850) 123 45 67</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border border-gray-200">
                    <CardContent className="flex items-center gap-4 py-4">
                      <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">E-posta</p>
                        <p className="text-sm text-gray-600">destek@mehmetcanpt.com</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ResponsiveLayout>
  )
}
