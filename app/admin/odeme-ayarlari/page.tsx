"use client"

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react"
import AdminLayout from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/use-toast"
import {
  AlertTriangle,
  CheckCircle,
  Loader2,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  XCircle,
} from "lucide-react"

type PaymentMethodForm = {
  id: string
  name: string
  enabled: boolean
  commission: string
}

type InstallmentOptionForm = {
  id: string
  bank: string
  installments: string
  commission: string
}

type PaytrSettingsForm = {
  mode: "TEST" | "LIVE"
  merchantId: string
  merchantKey: string
  merchantSalt: string
  merchantOkUrl: string
  merchantFailUrl: string
  merchantWebhookUrl: string
  currency: string
  language: string
  iframeDebug: boolean
  non3d: boolean
  maxInstallment: string
  paymentMethods: PaymentMethodForm[]
  installmentOptions: InstallmentOptionForm[]
}

type PaytrLogRow = {
  id: string
  action: string
  status?: string | null
  message?: string | null
  payload?: Record<string, unknown> | null
  error?: Record<string, unknown> | null
  userEmail?: string | null
  createdAt: string
}

const DEFAULT_PAYMENT_METHODS: PaymentMethodForm[] = [
  { id: "credit_card", name: "Kredi Kartı", enabled: true, commission: "2.8" },
  { id: "debit_card", name: "Banka Kartı", enabled: true, commission: "1.9" },
  { id: "bank_transfer", name: "Havale / EFT", enabled: false, commission: "0" },
]

const DEFAULT_INSTALLMENTS: InstallmentOptionForm[] = [
  { id: "akbank", bank: "Akbank", installments: "2,3,6,9,12", commission: "0" },
  { id: "garanti", bank: "Garanti BBVA", installments: "2,3,6,9,12", commission: "0" },
  { id: "isbank", bank: "İş Bankası", installments: "2,3,6,9,12", commission: "0" },
  { id: "yapikredi", bank: "Yapı Kredi", installments: "2,3,6,9,12", commission: "0" },
  { id: "ziraat", bank: "Ziraat Bankası", installments: "2,3,6,9,12", commission: "0" },
]

type ManualAccountForm = {
  id: string
  bankName: string
  accountName: string
  iban: string
  accountNumber: string
  branchName: string
  description: string
  isActive: boolean
  sortOrder: string
  isNew?: boolean
}

const INITIAL_FORM: PaytrSettingsForm = {
  mode: "TEST",
  merchantId: "",
  merchantKey: "",
  merchantSalt: "",
  merchantOkUrl: "",
  merchantFailUrl: "",
  merchantWebhookUrl: "",
  currency: "TL",
  language: "tr",
  iframeDebug: false,
  non3d: false,
  maxInstallment: "0",
  paymentMethods: DEFAULT_PAYMENT_METHODS,
  installmentOptions: DEFAULT_INSTALLMENTS,
}

const INITIAL_MANUAL_ACCOUNT: ManualAccountForm = {
  id: "",
  bankName: "",
  accountName: "",
  iban: "",
  accountNumber: "",
  branchName: "",
  description: "",
  isActive: true,
  sortOrder: "0",
  isNew: true,
}

const statusBadge = (status?: string | null) => {
  const normalized = status?.toLowerCase()
  if (normalized === "success") {
    return (
      <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
        Başarılı
      </Badge>
    )
  }
  if (normalized === "error" || normalized === "failed") {
    return (
      <Badge variant="destructive" className="bg-red-50 text-red-700">
        Hatalı
      </Badge>
    )
  }
  return <Badge variant="secondary">Bilinmiyor</Badge>
}

const formatDate = (value?: string | null) => {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })
}

const normalizePaymentMethods = (value: unknown): PaymentMethodForm[] => {
  if (!Array.isArray(value)) return DEFAULT_PAYMENT_METHODS
  return value.map((raw, index) => {
    const item = (raw ?? {}) as Record<string, unknown>
    const name =
      typeof item.name === "string" && item.name.trim().length > 0
        ? item.name.trim()
        : `Ödeme Yöntemi ${index + 1}`
    const id =
      typeof item.id === "string" && item.id.trim().length > 0
        ? item.id.trim()
        : name.toLowerCase().replace(/\s+/g, "-") || `method-${index + 1}`
    const commission =
      typeof item.commission === "number"
        ? String(item.commission)
        : typeof item.commission === "string"
        ? item.commission
        : "0"
    const enabled = typeof item.enabled === "boolean" ? item.enabled : true

    return {
      id,
      name,
      enabled,
      commission,
    }
  })
}

const normalizeInstallments = (value: unknown): InstallmentOptionForm[] => {
  if (!Array.isArray(value)) return DEFAULT_INSTALLMENTS
  return value.map((raw, index) => {
    const item = (raw ?? {}) as Record<string, unknown>
    const bank =
      typeof item.bank === "string" && item.bank.trim().length > 0 ? item.bank.trim() : `Banka ${index + 1}`
    const id =
      typeof item.id === "string" && item.id.trim().length > 0
        ? item.id.trim()
        : bank.toLowerCase().replace(/\s+/g, "-") || `bank-${index + 1}`

    const installmentsArray = Array.isArray(item.installments) ? item.installments : []
    const installments =
      installmentsArray.length > 0
        ? Array.from(
            new Set(
              installmentsArray
                .map((rawValue) => Number(rawValue))
                .filter((num) => Number.isFinite(num) && num > 0),
            ),
          ).join(",")
        : "2,3,6"

    const commission =
      typeof item.commission === "number"
        ? String(item.commission)
        : typeof item.commission === "string"
        ? item.commission
        : "0"

    return {
      id,
      bank,
      installments,
      commission,
    }
  })
}

const resolveLogMessage = (log: PaytrLogRow) => {
  if (log.message && log.message.trim().length > 0) {
    return log.message
  }
  if (log.error && typeof log.error === "object") {
    const reason = (log.error as Record<string, unknown>).reason
    if (typeof reason === "string" && reason.trim().length > 0) {
      return reason
    }
    const message = (log.error as Record<string, unknown>).message
    if (typeof message === "string" && message.trim().length > 0) {
      return message
    }
  }
  return "—"
}

export default function PaytrSettingsPage() {
  const [form, setForm] = useState<PaytrSettingsForm>(INITIAL_FORM)
  const [activeTab, setActiveTab] = useState("general")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testDialogOpen, setTestDialogOpen] = useState(false)
  const [testStatus, setTestStatus] = useState<"idle" | "running" | "success" | "error">("idle")
  const [testMessage, setTestMessage] = useState<string | null>(null)
  const [logs, setLogs] = useState<PaytrLogRow[]>([])
  const [hasStoredSecrets, setHasStoredSecrets] = useState({ merchantKey: false, merchantSalt: false })
  const [meta, setMeta] = useState<{ updatedAt: string | null; lastSyncedAt: string | null; updatedByEmail: string | null }>(
    { updatedAt: null, lastSyncedAt: null, updatedByEmail: null },
  )
  const [manualAccounts, setManualAccounts] = useState<ManualAccountForm[]>([])
  const [manualLoading, setManualLoading] = useState(true)
  const [manualSavingId, setManualSavingId] = useState<string | null>(null)
  const [manualDeletingId, setManualDeletingId] = useState<string | null>(null)
  const [newManualAccount, setNewManualAccount] = useState<ManualAccountForm>(INITIAL_MANUAL_ACCOUNT)

  const fetchSettings = useCallback(async ({ silent }: { silent?: boolean } = {}) => {
    if (!silent) {
      setLoading(true)
    }

    try {
      const response = await fetch("/api/admin/paytr-settings?limit=30", { cache: "no-store" })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "PayTR ayarları yüklenemedi")
      }

      if (data?.setting) {
        setForm({
          mode: data.setting.mode ?? "TEST",
          merchantId: data.setting.merchantId ?? "",
          merchantKey: "",
          merchantSalt: "",
          merchantOkUrl: data.setting.merchantOkUrl ?? "",
          merchantFailUrl: data.setting.merchantFailUrl ?? "",
          merchantWebhookUrl: data.setting.merchantWebhookUrl ?? "",
          currency: data.setting.currency ?? "TL",
          language: data.setting.language ?? "tr",
          iframeDebug: Boolean(data.setting.iframeDebug),
          non3d: Boolean(data.setting.non3d),
          maxInstallment: data.setting.maxInstallment ? String(data.setting.maxInstallment) : "0",
          paymentMethods: normalizePaymentMethods(data.setting.paymentMethods),
          installmentOptions: normalizeInstallments(data.setting.installmentConfig),
        })
        setHasStoredSecrets({
          merchantKey: data.setting.merchantKey === "********",
          merchantSalt: data.setting.merchantSalt === "********",
        })
        setMeta({
          updatedAt: data.setting.updatedAt ?? null,
          lastSyncedAt: data.setting.lastSyncedAt ?? null,
          updatedByEmail: data.setting.updatedByEmail ?? null,
        })
      } else {
        setForm(INITIAL_FORM)
        setHasStoredSecrets({ merchantKey: false, merchantSalt: false })
        setMeta({ updatedAt: null, lastSyncedAt: null, updatedByEmail: null })
      }

      setLogs(Array.isArray(data?.logs) ? data.logs : [])
    } catch (error) {
      toast({
        title: "Hata",
        description: (error as Error).message,
        variant: "destructive",
      })
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    void fetchSettings()
  }, [fetchSettings])

  const fetchManualAccounts = useCallback(async () => {
    setManualLoading(true)
    try {
      const response = await fetch("/api/admin/manual-payments", { cache: "no-store" })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Havale/EFT hesapları yüklenemedi")
      }

      const accountForms: ManualAccountForm[] = Array.isArray(data?.accounts)
        ? data.accounts.map((account: Record<string, unknown>) => ({
            id: String(account.id ?? ""),
            bankName: String(account.bankName ?? ""),
            accountName: String(account.accountName ?? ""),
            iban: String(account.iban ?? "").toUpperCase(),
            accountNumber: account.accountNumber ? String(account.accountNumber) : "",
            branchName: account.branchName ? String(account.branchName) : "",
            description: account.description ? String(account.description) : "",
            isActive: Boolean(account.isActive ?? true),
            sortOrder:
              typeof account.sortOrder === "number"
                ? String(account.sortOrder)
                : typeof account.sortOrder === "string"
                ? account.sortOrder
                : "0",
          }))
        : []
      setManualAccounts(accountForms)
      setNewManualAccount({
        ...INITIAL_MANUAL_ACCOUNT,
        sortOrder: String(accountForms.length),
      })
    } catch (error) {
      toast({
        title: "Hata",
        description: (error as Error).message,
        variant: "destructive",
      })
    } finally {
      setManualLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchManualAccounts()
  }, [fetchManualAccounts])

  const modeBadge = useMemo(
    () =>
      form.mode === "LIVE" ? (
        <Badge variant="default" className="bg-green-600 hover:bg-green-600">
          Canlı Mod
        </Badge>
      ) : (
        <Badge variant="secondary">Test Modu</Badge>
      ),
    [form.mode],
  )

  const buildPayload = useCallback(
    (includeAdvanced = true) => {
      const paymentMethodsPayload = includeAdvanced
        ? form.paymentMethods.map((method, index) => ({
            id:
              method.id && method.id.trim().length > 0
                ? method.id.trim()
                : method.name.trim().length > 0
                ? method.name.trim().toLowerCase().replace(/\s+/g, "-")
                : `method-${index + 1}`,
            name: method.name.trim().length > 0 ? method.name.trim() : `Ödeme Yöntemi ${index + 1}`,
            enabled: method.enabled,
            commission: Number(method.commission) || 0,
          }))
        : undefined

      const installmentPayload = includeAdvanced
        ? form.installmentOptions.map((option, index) => {
            const parsedInstallments = Array.from(
              new Set(
                option.installments
                  .split(",")
                  .map((value) => Number(value.trim()))
                  .filter((value) => Number.isFinite(value) && value > 0),
              ),
            ).sort((a, b) => a - b)

            return {
              bank: option.bank.trim().length > 0 ? option.bank.trim() : `Banka ${index + 1}`,
              installments: parsedInstallments,
              commission: Number(option.commission) || 0,
            }
          })
        : undefined

      const payload: Record<string, unknown> = {
        mode: form.mode,
        merchantId: form.merchantId.trim(),
        merchantKey: form.merchantKey.trim(),
        merchantSalt: form.merchantSalt.trim(),
        merchantOkUrl: form.merchantOkUrl.trim() || null,
        merchantFailUrl: form.merchantFailUrl.trim() || null,
        merchantWebhookUrl: form.merchantWebhookUrl.trim() || null,
        currency: form.currency.trim() || "TL",
        language: form.language.trim() || "tr",
        iframeDebug: form.iframeDebug,
        non3d: form.non3d,
        maxInstallment: Number.parseInt(form.maxInstallment, 10) || 0,
      }

      if (includeAdvanced) {
        payload.paymentMethods = paymentMethodsPayload
        payload.installmentConfig = installmentPayload
      }

      return payload
    },
    [form],
  )

  const handleSave = useCallback(async () => {
    try {
      setSaving(true)
      const payload = buildPayload(true)
      const response = await fetch("/api/admin/paytr-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || "PayTR ayarları kaydedilemedi")
      }

      toast({
        title: "Ayarlar kaydedildi",
        description: "PayTR yapılandırması güncellendi.",
      })

      setForm((prev) => ({
        ...prev,
        merchantKey: "",
        merchantSalt: "",
      }))

      await fetchSettings({ silent: true })
    } catch (error) {
      toast({
        title: "Hata",
        description: (error as Error).message,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }, [buildPayload, fetchSettings])

  const handleTestConnection = useCallback(async () => {
    setTestDialogOpen(true)
    setTestStatus("running")
    setTestMessage(null)

    try {
      const payload = buildPayload(false)
      const response = await fetch("/api/admin/paytr-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "PayTR bağlantı testi başarısız oldu")
      }

      setTestStatus("success")
      setTestMessage("PayTR bağlantı testi başarıyla tamamlandı.")
    } catch (error) {
      setTestStatus("error")
      setTestMessage((error as Error).message)
    } finally {
      await fetchSettings({ silent: true })
    }
  }, [buildPayload, fetchSettings])

  const handlePaymentMethodChange = (index: number, patch: Partial<PaymentMethodForm>) => {
    setForm((prev) => {
      const updated = [...prev.paymentMethods]
      updated[index] = { ...updated[index], ...patch }
      return { ...prev, paymentMethods: updated }
    })
  }

  const handleInstallmentChange = (index: number, patch: Partial<InstallmentOptionForm>) => {
    setForm((prev) => {
      const updated = [...prev.installmentOptions]
      updated[index] = { ...updated[index], ...patch }
      return { ...prev, installmentOptions: updated }
    })
  }

  const addPaymentMethod = () => {
    setForm((prev) => ({
      ...prev,
      paymentMethods: [
        ...prev.paymentMethods,
        { id: `custom-${Date.now()}`, name: "Yeni Ödeme Yöntemi", enabled: true, commission: "0" },
      ],
    }))
  }

  const removePaymentMethod = (index: number) => {
    setForm((prev) => {
      const updated = [...prev.paymentMethods]
      updated.splice(index, 1)
      return { ...prev, paymentMethods: updated.length > 0 ? updated : DEFAULT_PAYMENT_METHODS }
    })
  }

  const addInstallmentOption = () => {
    setForm((prev) => ({
      ...prev,
      installmentOptions: [
        ...prev.installmentOptions,
        { id: `bank-${Date.now()}`, bank: "Yeni Banka", installments: "2,3,6", commission: "0" },
      ],
    }))
  }

  const removeInstallmentOption = (index: number) => {
    setForm((prev) => {
      const updated = [...prev.installmentOptions]
      updated.splice(index, 1)
      return { ...prev, installmentOptions: updated.length > 0 ? updated : DEFAULT_INSTALLMENTS }
    })
  }

  const handleNumericInput = (event: ChangeEvent<HTMLInputElement>, field: keyof PaytrSettingsForm) => {
    const value = event.target.value.replace(/[^\d]/g, "")
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleManualAccountChange = (id: string, patch: Partial<ManualAccountForm>) => {
    setManualAccounts((prev) =>
      prev.map((account) => (account.id === id ? { ...account, ...patch } : account)),
    )
  }

  const handleNewManualAccountChange = (patch: Partial<ManualAccountForm>) => {
    setNewManualAccount((prev) => ({ ...prev, ...patch }))
  }

  const resetNewManualAccount = () => {
    setNewManualAccount({
      ...INITIAL_MANUAL_ACCOUNT,
      sortOrder: String(manualAccounts.length),
    })
  }

  const saveManualAccount = async (account: ManualAccountForm) => {
    try {
      if (!account.bankName.trim()) {
        throw new Error("Banka adı zorunludur.")
      }
      if (!account.accountName.trim()) {
        throw new Error("Hesap adı zorunludur.")
      }
      if (!account.iban.trim()) {
        throw new Error("IBAN zorunludur.")
      }

      setManualSavingId(account.id)

      const payload = {
        id: account.id,
        bankName: account.bankName.trim(),
        accountName: account.accountName.trim(),
        iban: account.iban.trim().toUpperCase(),
        accountNumber: account.accountNumber.trim(),
        branchName: account.branchName.trim(),
        description: account.description.trim(),
        isActive: account.isActive,
        sortOrder: Number.parseInt(account.sortOrder, 10) || 0,
      }

      const response = await fetch("/api/admin/manual-payments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || "Hesap güncellenemedi")
      }

      toast({ title: "Hesap güncellendi", description: `${account.bankName} için bilgiler kaydedildi.` })
      await fetchManualAccounts()
    } catch (error) {
      toast({
        title: "Hata",
        description: (error as Error).message,
        variant: "destructive",
      })
    } finally {
      setManualSavingId(null)
    }
  }

  const createManualAccount = async () => {
    try {
      if (!newManualAccount.bankName.trim()) {
        throw new Error("Banka adı zorunludur.")
      }
      if (!newManualAccount.accountName.trim()) {
        throw new Error("Hesap adı zorunludur.")
      }
      if (!newManualAccount.iban.trim()) {
        throw new Error("IBAN zorunludur.")
      }

      setManualSavingId("new")

      const payload = {
        bankName: newManualAccount.bankName.trim(),
        accountName: newManualAccount.accountName.trim(),
        iban: newManualAccount.iban.trim().toUpperCase(),
        accountNumber: newManualAccount.accountNumber.trim(),
        branchName: newManualAccount.branchName.trim(),
        description: newManualAccount.description.trim(),
        isActive: newManualAccount.isActive,
        sortOrder: Number.parseInt(newManualAccount.sortOrder, 10) || manualAccounts.length,
      }

      const response = await fetch("/api/admin/manual-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || "Hesap oluşturulamadı")
      }

      toast({
        title: "Hesap eklendi",
        description: `${newManualAccount.bankName} hesabı başarıyla kaydedildi.`,
      })
      resetNewManualAccount()
      await fetchManualAccounts()
    } catch (error) {
      toast({
        title: "Hata",
        description: (error as Error).message,
        variant: "destructive",
      })
    } finally {
      setManualSavingId(null)
    }
  }

  const deleteManualAccount = async (id: string) => {
    try {
      setManualDeletingId(id)
      const response = await fetch(`/api/admin/manual-payments?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || "Hesap silinemedi")
      }

      toast({ title: "Hesap silindi", description: "Havale hesabı listeden kaldırıldı." })
      await fetchManualAccounts()
    } catch (error) {
      toast({
        title: "Hata",
        description: (error as Error).message,
        variant: "destructive",
      })
    } finally {
      setManualDeletingId(null)
    }
  }

  const resetTestDialog = () => {
    setTestDialogOpen(false)
    setTestStatus("idle")
    setTestMessage(null)
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">PayTR Ödeme Ayarları</h1>
            <p className="text-muted-foreground">
              PayTR Iframe API bilgilerinizi yönetin, test edin ve log kayıtlarını inceleyin.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {meta.updatedAt && <span>Son güncelleme: {formatDate(meta.updatedAt)}</span>}
              {meta.updatedByEmail && <span>• Güncelleyen: {meta.updatedByEmail}</span>}
              {meta.lastSyncedAt && <span>• Son test: {formatDate(meta.lastSyncedAt)}</span>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {modeBadge}
            <Button
              variant="outline"
              onClick={() => fetchSettings({ silent: false })}
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Yenile
            </Button>
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={saving || loading}
            >
              <Shield className="mr-2 h-4 w-4" />
              Bağlantıyı Test Et
            </Button>
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Ayarları Kaydet
            </Button>
          </div>
        </div>

        <Alert className="border-primary/40 bg-primary/5">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Güvenlik Notu</AlertTitle>
          <AlertDescription>
            Merchant Key ve Merchant Salt bilgileri yalnızca kaydettiğinizde güncellenir. Alanları boş bırakırsanız mevcut
            anahtarlar korunur.
          </AlertDescription>
        </Alert>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-1 md:grid-cols-4">
              <TabsTrigger value="general">Genel Ayarlar</TabsTrigger>
              <TabsTrigger value="payment">Ödeme &amp; Taksit</TabsTrigger>
              <TabsTrigger value="manual">Manuel EFT / Havale</TabsTrigger>
              <TabsTrigger value="logs">Log Kayıtları</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>PayTR API Bilgileri</CardTitle>
                  <CardDescription>
                    PayTR tarafından sağlanan merchant bilgilerini girin. Bu bilgiler sunucuda güvenli şekilde saklanır.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="merchantId">Merchant ID</Label>
                      <Input
                        id="merchantId"
                        value={form.merchantId}
                        onChange={(event) => setForm((prev) => ({ ...prev, merchantId: event.target.value }))}
                        placeholder="Örn: 123456"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                      <div>
                        <p className="font-medium">Mod</p>
                        <p className="text-sm text-muted-foreground">
                          Test verilerini canlı moddan ayrı tutmak için gerektiğinde değiştirin.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase text-muted-foreground">Test</span>
                        <Switch
                          checked={form.mode === "LIVE"}
                          onCheckedChange={(checked) => setForm((prev) => ({ ...prev, mode: checked ? "LIVE" : "TEST" }))}
                        />
                        <span className="text-xs uppercase text-muted-foreground">Canlı</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="merchantKey">
                        Merchant Key{" "}
                        {hasStoredSecrets.merchantKey && <span className="text-xs text-muted-foreground">(kaydedildi)</span>}
                      </Label>
                      <Input
                        id="merchantKey"
                        type="password"
                        value={form.merchantKey}
                        onChange={(event) => setForm((prev) => ({ ...prev, merchantKey: event.target.value }))}
                        placeholder={hasStoredSecrets.merchantKey ? "Mevcut anahtar korunur" : "Yeni anahtar girin"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="merchantSalt">
                        Merchant Salt{" "}
                        {hasStoredSecrets.merchantSalt && (
                          <span className="text-xs text-muted-foreground">(kaydedildi)</span>
                        )}
                      </Label>
                      <Input
                        id="merchantSalt"
                        type="password"
                        value={form.merchantSalt}
                        onChange={(event) => setForm((prev) => ({ ...prev, merchantSalt: event.target.value }))}
                        placeholder={hasStoredSecrets.merchantSalt ? "Mevcut salt korunur" : "Yeni salt girin"}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="merchantOkUrl">Başarılı Ödeme URL</Label>
                      <Input
                        id="merchantOkUrl"
                        value={form.merchantOkUrl}
                        onChange={(event) => setForm((prev) => ({ ...prev, merchantOkUrl: event.target.value }))}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="merchantFailUrl">Başarısız Ödeme URL</Label>
                      <Input
                        id="merchantFailUrl"
                        value={form.merchantFailUrl}
                        onChange={(event) => setForm((prev) => ({ ...prev, merchantFailUrl: event.target.value }))}
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="merchantWebhookUrl">Bildirim (Webhook) URL</Label>
                    <Input
                      id="merchantWebhookUrl"
                      value={form.merchantWebhookUrl}
                      onChange={(event) => setForm((prev) => ({ ...prev, merchantWebhookUrl: event.target.value }))}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="currency">Para Birimi</Label>
                      <Input
                        id="currency"
                        value={form.currency}
                        onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))}
                        placeholder="TL"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="language">Dil</Label>
                      <Input
                        id="language"
                        value={form.language}
                        onChange={(event) => setForm((prev) => ({ ...prev, language: event.target.value.toLowerCase() }))}
                        placeholder="tr"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxInstallment">Maksimum Taksit</Label>
                      <Input
                        id="maxInstallment"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={form.maxInstallment}
                        onChange={(event) => handleNumericInput(event, "maxInstallment")}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium">Iframe Debug Modu</p>
                        <p className="text-sm text-muted-foreground">
                          PayTR iframe yanıtlarını detaylı görmek için kullanılır. Canlı ortamda kapatılması önerilir.
                        </p>
                      </div>
                      <Switch
                        checked={form.iframeDebug}
                        onCheckedChange={(checked) => setForm((prev) => ({ ...prev, iframeDebug: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium">3D Secure Zorunluluğu</p>
                        <p className="text-sm text-muted-foreground">
                          Non-3D işlemleri izin vermek için kapatın. Güvenlik için açılması önerilir.
                        </p>
                      </div>
                      <Switch
                        checked={!form.non3d}
                        onCheckedChange={(checked) => setForm((prev) => ({ ...prev, non3d: !checked }))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payment" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle>Ödeme Yöntemleri</CardTitle>
                    <CardDescription>PayTR üzerinde desteklediğiniz ödeme yöntemlerini yönetin.</CardDescription>
                  </div>
                  <Button variant="outline" onClick={addPaymentMethod}>
                    <Plus className="mr-2 h-4 w-4" />
                    Yeni Ödeme Yöntemi
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {form.paymentMethods.map((method, index) => (
                      <Card key={method.id} className="border-muted-foreground/20">
                        <CardContent className="space-y-3 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <Input
                                value={method.name}
                                onChange={(event) =>
                                  handlePaymentMethodChange(index, { name: event.target.value })
                                }
                                placeholder="Ödeme yöntemi adı"
                              />
                              <p className="text-xs text-muted-foreground">
                                Kimlik: <span className="font-mono">{method.id}</span>
                              </p>
                            </div>
                            <Switch
                              checked={method.enabled}
                              onCheckedChange={(checked) => handlePaymentMethodChange(index, { enabled: checked })}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              value={method.commission}
                              onChange={(event) =>
                                handlePaymentMethodChange(index, {
                                  commission: event.target.value.replace(/[^0-9.,]/g, ""),
                                })
                              }
                              placeholder="Komisyon (%)"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                          {form.paymentMethods.length > 1 && (
                            <Button
                              variant="ghost"
                              className="h-8 w-full text-red-600 hover:text-red-600"
                              onClick={() => removePaymentMethod(index)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Sil
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle>Taksit Ayarları</CardTitle>
                    <CardDescription>Banka bazlı taksit seçeneklerini ve komisyonlarını düzenleyin.</CardDescription>
                  </div>
                  <Button variant="outline" onClick={addInstallmentOption}>
                    <Plus className="mr-2 h-4 w-4" />
                    Yeni Banka
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    {form.installmentOptions.map((option, index) => (
                      <div key={option.id} className="rounded-lg border p-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div className="flex-1 space-y-2">
                            <Label>Banka Adı</Label>
                            <Input
                              value={option.bank}
                              onChange={(event) =>
                                handleInstallmentChange(index, { bank: event.target.value })
                              }
                              placeholder="Örn: Akbank"
                            />
                          </div>
                          <div className="flex-1 space-y-2">
                            <Label>Taksit Seçenekleri</Label>
                            <Input
                              value={option.installments}
                              onChange={(event) =>
                                handleInstallmentChange(index, {
                                  installments: event.target.value.replace(/[^0-9,]/g, ""),
                                })
                              }
                              placeholder="Örn: 2,3,6,9,12"
                            />
                          </div>
                          <div className="flex-1 space-y-2">
                            <Label>Ek Komisyon (%)</Label>
                            <Input
                              value={option.commission}
                              onChange={(event) =>
                                handleInstallmentChange(index, {
                                  commission: event.target.value.replace(/[^0-9.,]/g, ""),
                                })
                              }
                              placeholder="0"
                            />
                          </div>
                          {form.installmentOptions.length > 1 && (
                            <Button
                              variant="ghost"
                              className="self-start text-red-600 hover:text-red-600"
                              onClick={() => removeInstallmentOption(index)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Sil
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="manual" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Manuel Havale / EFT Bilgileri</CardTitle>
                  <CardDescription>
                    Müşterilerinizin banka Havale / EFT ile ödeme yapabilmesi için IBAN bilgilerinizi burada yönetin.
                    Bu bilgiler satın alma adımlarında danışanlara gösterilir.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle>Kayıtlı Banka Hesapları</CardTitle>
                    <CardDescription>Aktif hesaplar ödeme sayfasında listelenir.</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => fetchManualAccounts()}
                    disabled={manualLoading}
                  >
                    {manualLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Yenile
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {manualLoading ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {Array.from({ length: 2 }).map((_, index) => (
                        <Skeleton key={`manual-skeleton-${index}`} className="h-48 w-full" />
                      ))}
                    </div>
                  ) : manualAccounts.length === 0 ? (
                    <Alert className="border-dashed">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Kayıtlı hesap yok</AlertTitle>
                      <AlertDescription>
                        Aşağıdaki formu kullanarak ilk havale hesabınızı ekleyebilirsiniz.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {manualAccounts.map((account) => (
                        <div key={account.id} className="space-y-4 rounded-lg border p-4">
                          <div className="grid gap-3">
                            <div className="space-y-2">
                              <Label>Banka Adı</Label>
                              <Input
                                value={account.bankName}
                                onChange={(event) =>
                                  handleManualAccountChange(account.id, { bankName: event.target.value })
                                }
                                placeholder="Örn: Ziraat Bankası"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Hesap Sahibi</Label>
                              <Input
                                value={account.accountName}
                                onChange={(event) =>
                                  handleManualAccountChange(account.id, { accountName: event.target.value })
                                }
                                placeholder="Ad Soyad / Şirket"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>IBAN</Label>
                              <Input
                                value={account.iban}
                                onChange={(event) =>
                                  handleManualAccountChange(account.id, { iban: event.target.value.toUpperCase() })
                                }
                                placeholder="TR00 0000 0000 0000 0000 0000 00"
                              />
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="space-y-2">
                                <Label>Hesap Numarası</Label>
                                <Input
                                  value={account.accountNumber}
                                  onChange={(event) =>
                                    handleManualAccountChange(account.id, { accountNumber: event.target.value })
                                  }
                                  placeholder="Opsiyonel"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Şube</Label>
                                <Input
                                  value={account.branchName}
                                  onChange={(event) =>
                                    handleManualAccountChange(account.id, { branchName: event.target.value })
                                  }
                                  placeholder="Opsiyonel"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Görünüm Sırası</Label>
                              <Input
                                value={account.sortOrder}
                                onChange={(event) =>
                                  handleManualAccountChange(account.id, {
                                    sortOrder: event.target.value.replace(/[^\d]/g, ""),
                                  })
                                }
                                placeholder="0"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Açıklama</Label>
                              <Textarea
                                value={account.description}
                                onChange={(event) =>
                                  handleManualAccountChange(account.id, { description: event.target.value })
                                }
                                placeholder="Örn: Ödeme açıklamasına ad soyadınızı yazınız."
                                rows={3}
                              />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                              <div>
                                <p className="font-medium">Aktif</p>
                                <p className="text-xs text-muted-foreground">
                                  Pasif hesaplar danışanlara gösterilmez.
                                </p>
                              </div>
                              <Switch
                                checked={account.isActive}
                                onCheckedChange={(checked) =>
                                  handleManualAccountChange(account.id, { isActive: checked })
                                }
                              />
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Button
                              className="flex-1 gap-2"
                              onClick={() => saveManualAccount(account)}
                              disabled={manualSavingId === account.id}
                            >
                              {manualSavingId === account.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                              Kaydet
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-1 gap-2 text-red-600 hover:text-red-700"
                              onClick={() => deleteManualAccount(account.id)}
                              disabled={manualDeletingId === account.id}
                            >
                              {manualDeletingId === account.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                              Sil
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Yeni Hesap Ekle</CardTitle>
                  <CardDescription>Yeni bir banka hesabını aşağıdaki formu doldurarak ekleyin.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Banka Adı</Label>
                      <Input
                        value={newManualAccount.bankName}
                        onChange={(event) =>
                          handleNewManualAccountChange({ bankName: event.target.value })
                        }
                        placeholder="Örn: Garanti BBVA"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Hesap Sahibi</Label>
                      <Input
                        value={newManualAccount.accountName}
                        onChange={(event) =>
                          handleNewManualAccountChange({ accountName: event.target.value })
                        }
                        placeholder="Ad Soyad / Şirket"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>IBAN</Label>
                      <Input
                        value={newManualAccount.iban}
                        onChange={(event) =>
                          handleNewManualAccountChange({ iban: event.target.value.toUpperCase() })
                        }
                        placeholder="TR00 0000 0000 0000 0000 0000 00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Hesap Numarası</Label>
                      <Input
                        value={newManualAccount.accountNumber}
                        onChange={(event) =>
                          handleNewManualAccountChange({ accountNumber: event.target.value })
                        }
                        placeholder="Opsiyonel"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Şube</Label>
                      <Input
                        value={newManualAccount.branchName}
                        onChange={(event) =>
                          handleNewManualAccountChange({ branchName: event.target.value })
                        }
                        placeholder="Opsiyonel"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Görünüm Sırası</Label>
                      <Input
                        value={newManualAccount.sortOrder}
                        onChange={(event) =>
                          handleNewManualAccountChange({
                            sortOrder: event.target.value.replace(/[^\d]/g, ""),
                          })
                        }
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Açıklama</Label>
                      <Textarea
                        value={newManualAccount.description}
                        onChange={(event) =>
                          handleNewManualAccountChange({ description: event.target.value })
                        }
                        placeholder="Örn: Açıklama alanına üyelik e-posta adresinizi yazın."
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                    <div>
                      <p className="font-medium">Hesap Aktif mi?</p>
                      <p className="text-xs text-muted-foreground">
                        Aktif olmayan hesaplar müşteri tarafında gösterilmez.
                      </p>
                    </div>
                    <Switch
                      checked={newManualAccount.isActive}
                      onCheckedChange={(checked) => handleNewManualAccountChange({ isActive: checked })}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={createManualAccount}
                      className="gap-2"
                      disabled={manualSavingId === "new"}
                    >
                      {manualSavingId === "new" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Hesap Ekle
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logs">
              <Card>
                <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle>PayTR İşlem Logları</CardTitle>
                    <CardDescription>Son yapılan ayar değişiklikleri ve bağlantı testleri listelenir.</CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => fetchSettings({ silent: false })} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Logları Yenile
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {logs.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
                      Henüz bir kayıt bulunmuyor. İlk log, bağlantı testi yaptığınızda veya ayarları kaydettiğinizde
                      oluşacaktır.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tarih</TableHead>
                            <TableHead>İşlem</TableHead>
                            <TableHead>Durum</TableHead>
                            <TableHead>Mesaj</TableHead>
                            <TableHead>Kullanıcı</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {logs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell>{formatDate(log.createdAt)}</TableCell>
                              <TableCell className="font-mono text-xs">{log.action}</TableCell>
                              <TableCell>{statusBadge(log.status)}</TableCell>
                              <TableCell className="max-w-md text-sm">{resolveLogMessage(log)}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {log.userEmail ?? "Sistem"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <Dialog open={testDialogOpen} onOpenChange={resetTestDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>PayTR Bağlantısı Test Ediliyor</DialogTitle>
              <DialogDescription>
                Merchant bilgilerinizi kullanarak PayTR Iframe API&apos;sine bağlanma testi yürütülüyor.
              </DialogDescription>
            </DialogHeader>

            <div className="py-6">
              {testStatus === "running" && (
                <div className="flex items-center gap-3 text-sm">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span>Bağlantı testi devam ediyor...</span>
                </div>
              )}
              {testStatus === "success" && (
                <div className="flex items-center gap-3 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span>{testMessage}</span>
                </div>
              )}
              {testStatus === "error" && (
                <div className="flex items-start gap-3 text-red-600">
                  <XCircle className="mt-0.5 h-5 w-5" />
                  <span>{testMessage}</span>
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={resetTestDialog}>
                Kapat
              </Button>
              {testStatus !== "running" && (
                <Button variant="default" onClick={handleTestConnection}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Yeniden Test Et
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
