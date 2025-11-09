"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import AdminLayout from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/use-toast"
import {
  Users,
  UserPlus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Calendar,
  Dumbbell,
} from "lucide-react"

type Summary = {
  totalUsers: number
  activeClients: number
  trainerCount: number
  inactiveUsers: number
}

type UserRow = {
  id: string
  name: string
  email: string
  phone: string | null
  role: "danisan" | "egitmen"
  status: "active" | "inactive"
  joinDate: string
  lastLogin: string
  avatar: string | null
  trainer: string | null
  package: string | null
  clients: number | null
}

const INITIAL_NEW_USER = {
  name: "",
  email: "",
  phone: "",
  role: "danisan",
  password: "",
  notes: "",
}

const INITIAL_EDIT_USER = {
  id: "",
  name: "",
  email: "",
  phone: "",
  role: "danisan" as "danisan" | "egitmen",
  status: "active" as "active" | "inactive",
  password: "",
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [isViewUserOpen, setIsViewUserOpen] = useState(false)
  const [isEditUserOpen, setIsEditUserOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [newUser, setNewUser] = useState(INITIAL_NEW_USER)
  const [editUser, setEditUser] = useState(INITIAL_EDIT_USER)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditSubmitting, setIsEditSubmitting] = useState(false)

  const [loadingUsers, setLoadingUsers] = useState(false)
  const [usersError, setUsersError] = useState<string | null>(null)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim())
    }, 400)

    return () => clearTimeout(timeout)
  }, [searchTerm])

  const fetchUsers = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setLoadingUsers(true)
        setUsersError(null)

        const params = new URLSearchParams()
        if (roleFilter !== "all") params.set("role", roleFilter)
        if (statusFilter !== "all") params.set("status", statusFilter)
        if (debouncedSearch) params.set("search", debouncedSearch)

        const response = await fetch(`/api/admin/users?${params.toString()}`, {
          signal,
          cache: "no-store",
        })

        if (!response.ok) {
          const data = await response.json().catch(() => null)
          throw new Error(data?.error || "Kullanıcılar yüklenemedi")
        }

        const data = await response.json()
        const mappedUsers: UserRow[] = Array.isArray(data?.users)
          ? data.users.map((user: any) => ({
              id: user.id,
              name: typeof user.name === "string" ? user.name : user.email,
              email: user.email,
              phone: user.phone ?? null,
              role: user.role === "TRAINER" ? "egitmen" : "danisan",
              status: user.isActive ? "active" : "inactive",
              joinDate: user.joinDate,
              lastLogin: user.lastLogin,
              avatar: user.avatar ?? null,
              trainer: user.trainer ?? null,
              package: user.package ?? null,
              clients: typeof user.clients === "number" ? user.clients : null,
            }))
          : []

        setUsers(mappedUsers)
        setSummary(
          data?.summary
            ? {
                totalUsers: data.summary.totalUsers ?? 0,
                activeClients: data.summary.activeClients ?? 0,
                trainerCount: data.summary.trainerCount ?? 0,
                inactiveUsers: data.summary.inactiveUsers ?? 0,
              }
            : null,
        )
      } catch (error) {
        if ((error as Error).name === "AbortError") return
        console.error("Admin users fetch error:", error)
        setUsersError((error as Error).message || "Kullanıcılar yüklenemedi")
      } finally {
        setLoadingUsers(false)
      }
    },
    [roleFilter, statusFilter, debouncedSearch],
  )

  useEffect(() => {
    const controller = new AbortController()
    void fetchUsers(controller.signal)
    return () => controller.abort()
  }, [fetchUsers])

  const statCards = useMemo(() => {
    if (!summary) return []
    return [
      { name: "Toplam Kullanıcı", value: summary.totalUsers, icon: Users, color: "text-blue-600" },
      { name: "Aktif Danışan", value: summary.activeClients, icon: UserCheck, color: "text-green-600" },
      { name: "Eğitmen Sayısı", value: summary.trainerCount, icon: Dumbbell, color: "text-purple-600" },
      { name: "Pasif Kullanıcı", value: summary.inactiveUsers, icon: UserX, color: "text-red-600" },
    ]
  }, [summary])

  const formatDate = (value: string) => {
    try {
      return new Date(value).toLocaleDateString("tr-TR")
    } catch {
      return "-"
    }
  }

  const formatNumber = (value: number) => new Intl.NumberFormat("tr-TR").format(value)

  const handleAddUser = async () => {
    const roleValue = newUser.role === "egitmen" ? "TRAINER" : "CLIENT"

    if (!newUser.name || !newUser.email || !newUser.password) {
      toast({
        title: "Eksik bilgi",
        description: "Ad, e-posta ve şifre alanlarının doldurulması gerekiyor.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          role: roleValue,
          password: newUser.password,
          notes: newUser.notes,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || "Kullanıcı eklenemedi")
      }

      toast({
        title: "Kullanıcı eklendi",
        description: `${newUser.name} sisteme eklendi.`,
      })

      setIsAddUserOpen(false)
      setNewUser(INITIAL_NEW_USER)
      await fetchUsers()
    } catch (error) {
      console.error("User create error:", error)
      toast({
        title: "Hata",
        description: (error as Error).message || "Kullanıcı eklenirken bir sorun oluştu.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditUser = (user: UserRow) => {
    setEditUser({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone ?? "",
      role: user.role,
      status: user.status,
      password: "",
    })
    setIsEditUserOpen(true)
  }

  const handleUpdateUser = async () => {
    if (!editUser.id) {
      toast({
        title: "Hata",
        description: "Kullanıcı bulunamadı.",
        variant: "destructive",
      })
      return
    }

    if (!editUser.name.trim()) {
      toast({
        title: "Eksik bilgi",
        description: "Ad Soyad alanı boş bırakılamaz.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsEditSubmitting(true)

      const payload: Record<string, unknown> = {
        id: editUser.id,
        name: editUser.name.trim(),
        role: editUser.role === "egitmen" ? "TRAINER" : "CLIENT",
        status: editUser.status,
      }

      payload.phone = editUser.phone ?? ""

      if (editUser.password.trim()) {
        payload.password = editUser.password.trim()
      }

      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || "Kullanıcı güncellenemedi")
      }

      toast({
        title: "Kullanıcı güncellendi",
        description: "Kullanıcı bilgileri başarıyla güncellendi.",
      })

      setIsEditUserOpen(false)
      setEditUser(INITIAL_EDIT_USER)
      await fetchUsers()
    } catch (error) {
      console.error("User edit error:", error)
      toast({
        title: "Hata",
        description: (error as Error).message || "Kullanıcı güncellenirken bir sorun oluştu.",
        variant: "destructive",
      })
    } finally {
      setIsEditSubmitting(false)
    }
  }

  const handleViewUser = (user: UserRow) => {
    setSelectedUser(user)
    setIsViewUserOpen(true)
  }

  const handleStatusChange = async (userId: string, newStatus: "active" | "inactive") => {
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: userId,
          status: newStatus,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || "Durum güncellenemedi")
      }

      toast({
        title: "Durum güncellendi",
        description: `Kullanıcı durumu ${newStatus === "active" ? "aktif" : "pasif"} olarak ayarlandı.`,
      })

      await fetchUsers()
    } catch (error) {
      console.error("Status update error:", error)
      toast({
        title: "Hata",
        description: (error as Error).message || "Durum güncellenirken bir sorun oluştu.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteClick = (user: UserRow) => {
    setUserToDelete(user)
    setDeleteDialogOpen(true)
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return

    try {
      setIsDeleting(true)
      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: userToDelete.id }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || "Kullanıcı silinemedi")
      }

      toast({
        title: "Kullanıcı silindi",
        description: `${userToDelete.name} sistemden kalıcı olarak silindi.`,
      })

      setDeleteDialogOpen(false)
      setUserToDelete(null)
      await fetchUsers()
    } catch (error) {
      console.error("User delete error:", error)
      toast({
        title: "Hata",
        description: (error as Error).message || "Kullanıcı silinirken bir sorun oluştu.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredUsers = users

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Kullanıcı Yönetimi</h1>
            <p className="text-muted-foreground">Eğitmen ve danışanları yönetin</p>
          </div>
          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Yeni Kullanıcı
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Yeni Kullanıcı Ekle</DialogTitle>
                <DialogDescription>Sisteme yeni bir kullanıcı ekleyin. Tüm alanları doldurun.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Ad Soyad
                  </Label>
                  <Input
                    id="name"
                    value={newUser.name}
                    onChange={(event) => setNewUser({ ...newUser, name: event.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    E-posta
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(event) => setNewUser({ ...newUser, email: event.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone" className="text-right">
                    Telefon
                  </Label>
                  <Input
                    id="phone"
                    value={newUser.phone}
                    onChange={(event) => setNewUser({ ...newUser, phone: event.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">
                    Rol
                  </Label>
                  <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="danisan">Danışan</SelectItem>
                      <SelectItem value="egitmen">Eğitmen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right">
                    Şifre
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(event) => setNewUser({ ...newUser, password: event.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="notes" className="text-right">
                    Notlar
                  </Label>
                  <Textarea
                    id="notes"
                    value={newUser.notes}
                    onChange={(event) => setNewUser({ ...newUser, notes: event.target.value })}
                    className="col-span-3"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" onClick={handleAddUser} disabled={isSubmitting}>
                  {isSubmitting ? "Kaydediliyor..." : "Kullanıcı Ekle"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {loadingUsers && !summary
            ? Array.from({ length: 4 }).map((_, index) => (
                <Card key={`stat-skeleton-${index}`} className="space-y-3 p-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-7 w-20" />
                </Card>
              ))
            : statCards.map((stat) => (
                <Card key={stat.name}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(stat.value)}</div>
                  </CardContent>
                </Card>
              ))}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Kullanıcı Listesi</CardTitle>
            <CardDescription>Tüm kullanıcıları görüntüleyin ve yönetin</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Kullanıcı ara..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Roller</SelectItem>
                  <SelectItem value="danisan">Danışan</SelectItem>
                  <SelectItem value="egitmen">Eğitmen</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Durum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Durumlar</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Pasif</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Users Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kullanıcı</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Son Güncelleme</TableHead>
                    <TableHead>Kayıt Tarihi</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingUsers && filteredUsers.length === 0 ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={`user-skeleton-${index}`}>
                        <TableCell colSpan={6}>
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                        Görüntülenecek kullanıcı bulunamadı.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar ?? "/placeholder.svg"} />
                              <AvatarFallback>
                                {user.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.role === "egitmen" ? "default" : "secondary"}>
                            {user.role === "egitmen" ? (
                              <>
                                <Dumbbell className="mr-1 h-3 w-3" />
                                Eğitmen
                              </>
                            ) : (
                              <>
                                <Users className="mr-1 h-3 w-3" />
                                Danışan
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.status === "active" ? "default" : "destructive"}>
                            {user.status === "active" ? "Aktif" : "Pasif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(user.lastLogin)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(user.joinDate)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleViewUser(user)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Görüntüle
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Düzenle
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(user.id, user.status === "active" ? "inactive" : "active")}
                              >
                                {user.status === "active" ? (
                                  <>
                                    <UserX className="mr-2 h-4 w-4" />
                                    Pasif Yap
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    Aktif Yap
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(user)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Kullanıcıyı Sil
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {usersError ? (
              <p className="mt-3 text-sm text-destructive">{usersError}</p>
            ) : null}
          </CardContent>
        </Card>

        {/* User Detail Dialog */}
        <Dialog open={isViewUserOpen} onOpenChange={setIsViewUserOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Kullanıcı Detayları</DialogTitle>
              <DialogDescription>{selectedUser?.name} kullanıcısının detaylı bilgileri</DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedUser.avatar ?? "/placeholder.svg"} />
                    <AvatarFallback>
                      {selectedUser.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold">{selectedUser.name}</h3>
                    <Badge variant={selectedUser.role === "egitmen" ? "default" : "secondary"}>
                      {selectedUser.role === "egitmen" ? "Eğitmen" : "Danışan"}
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedUser.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedUser.phone || "-"}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Kayıt: {formatDate(selectedUser.joinDate)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Son Güncelleme: {formatDate(selectedUser.lastLogin)}</span>
                  </div>
                </div>

                {selectedUser.role === "danisan" && (
                  <div className="border-t pt-4">
                    <h4 className="mb-2 font-medium">Danışan Bilgileri</h4>
                    <div className="space-y-2 text-sm">
                      <div>Eğitmen: {selectedUser.trainer ?? "-"}</div>
                      <div>Paket: {selectedUser.package ?? "-"}</div>
                    </div>
                  </div>
                )}

                {selectedUser.role === "egitmen" && (
                  <div className="border-t pt-4">
                    <h4 className="mb-2 font-medium">Eğitmen Bilgileri</h4>
                    <div className="space-y-2 text-sm">
                      <div>Danışan Sayısı: {selectedUser.clients ?? 0}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog
          open={isEditUserOpen}
          onOpenChange={(open) => {
            setIsEditUserOpen(open)
            if (!open) {
              setEditUser(INITIAL_EDIT_USER)
              setIsEditSubmitting(false)
            }
          }}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Kullanıcıyı Düzenle</DialogTitle>
              <DialogDescription>Kullanıcı bilgilerini güncelleyin. Şifreyi boş bırakırsanız değişmez.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editName" className="text-right">
                  Ad Soyad
                </Label>
                <Input
                  id="editName"
                  value={editUser.name}
                  onChange={(event) => setEditUser((prev) => ({ ...prev, name: event.target.value }))}
                  className="col-span-3"
                  disabled={isEditSubmitting}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">E-posta</Label>
                <Input value={editUser.email} className="col-span-3" disabled />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editPhone" className="text-right">
                  Telefon
                </Label>
                <Input
                  id="editPhone"
                  value={editUser.phone}
                  onChange={(event) => setEditUser((prev) => ({ ...prev, phone: event.target.value }))}
                  className="col-span-3"
                  disabled={isEditSubmitting}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Rol</Label>
                <Select
                  value={editUser.role}
                  onValueChange={(value: "danisan" | "egitmen") => setEditUser((prev) => ({ ...prev, role: value }))}
                  disabled={isEditSubmitting}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Rol seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="danisan">Danışan</SelectItem>
                    <SelectItem value="egitmen">Eğitmen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Durum</Label>
                <Select
                  value={editUser.status}
                  onValueChange={(value: "active" | "inactive") => setEditUser((prev) => ({ ...prev, status: value }))}
                  disabled={isEditSubmitting}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Durum seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="inactive">Pasif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editPassword" className="text-right">
                  Yeni Şifre
                </Label>
                <Input
                  id="editPassword"
                  type="password"
                  placeholder="Şifreyi değiştirmek için girin"
                  value={editUser.password}
                  onChange={(event) => setEditUser((prev) => ({ ...prev, password: event.target.value }))}
                  className="col-span-3"
                  disabled={isEditSubmitting}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditUserOpen(false)} disabled={isEditSubmitting}>
                İptal
              </Button>
              <Button type="button" onClick={handleUpdateUser} disabled={isEditSubmitting}>
                {isEditSubmitting ? "Güncelleniyor..." : "Güncelle"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Kullanıcıyı Sil</AlertDialogTitle>
              <AlertDialogDescription>
                {userToDelete && (
                  <>
                    <strong>{userToDelete.name}</strong> kullanıcısını kalıcı olarak silmek istediğinizden emin misiniz?
                    <br />
                    <br />
                    Bu işlem geri alınamaz. Kullanıcının tüm verileri (profil, antrenman programları, beslenme programları vb.) silinecektir.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>İptal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Siliniyor..." : "Sil"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  )
}
