"use client"

import { useState } from "react"
import AdminLayout from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import {
  FileText,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  ImageIcon,
  ChefHat,
  Dumbbell,
  Pill,
  HelpCircle,
} from "lucide-react"

const contentStats = [
  { name: "Toplam İçerik", value: "1,247", icon: FileText, color: "text-blue-600" },
  { name: "Yayında", value: "892", icon: Eye, color: "text-green-600" },
  { name: "Taslak", value: "245", icon: Edit, color: "text-yellow-600" },
  { name: "Arşiv", value: "110", icon: Trash2, color: "text-red-600" },
]

const recipes = [
  {
    id: 1,
    title: "Protein Pancake",
    category: "Kahvaltı",
    status: "published",
    author: "Admin",
    date: "2024-03-10",
    views: 1250,
    image: "/protein-pancakes-with-berries.png",
  },
  {
    id: 2,
    title: "Izgara Tavuk Salatası",
    category: "Ana Yemek",
    status: "published",
    author: "Chef Ali",
    date: "2024-03-09",
    views: 890,
    image: "/grilled-chicken-salad.png",
  },
  {
    id: 3,
    title: "Post-Workout Smoothie",
    category: "İçecek",
    status: "draft",
    author: "Nutritionist",
    date: "2024-03-08",
    views: 0,
    image: "/protein-smoothie-with-fruits.png",
  },
]

const exercises = [
  {
    id: 1,
    name: "Bench Press",
    category: "Göğüs",
    difficulty: "Orta",
    status: "published",
    author: "Trainer Mehmet",
    date: "2024-03-10",
    views: 2150,
  },
  {
    id: 2,
    name: "Squat",
    category: "Bacak",
    difficulty: "Kolay",
    status: "published",
    author: "Trainer Ayşe",
    date: "2024-03-09",
    views: 1890,
  },
  {
    id: 3,
    name: "Deadlift",
    category: "Sırt",
    difficulty: "Zor",
    status: "review",
    author: "Trainer Can",
    date: "2024-03-08",
    views: 0,
  },
]

const supplements = [
  {
    id: 1,
    name: "Whey Protein",
    category: "Protein",
    brand: "Optimum Nutrition",
    status: "published",
    price: "₺299",
    stock: 45,
    date: "2024-03-10",
  },
  {
    id: 2,
    name: "Creatine Monohydrate",
    category: "Performans",
    brand: "Universal",
    status: "published",
    price: "₺149",
    stock: 23,
    date: "2024-03-09",
  },
  {
    id: 3,
    name: "BCAA Complex",
    category: "Amino Asit",
    brand: "Scivation",
    status: "draft",
    price: "₺199",
    stock: 0,
    date: "2024-03-08",
  },
]

const blogPosts = [
  {
    id: 1,
    title: "Kilo Verme İçin 10 Altın Kural",
    category: "Beslenme",
    status: "published",
    author: "Dr. Ahmet",
    date: "2024-03-10",
    views: 3250,
    comments: 45,
  },
  {
    id: 2,
    title: "Evde Antrenman Programı",
    category: "Antrenman",
    status: "published",
    author: "Trainer Fatma",
    date: "2024-03-09",
    views: 2180,
    comments: 32,
  },
  {
    id: 3,
    title: "Supplement Kullanım Rehberi",
    category: "Supplementler",
    status: "draft",
    author: "Uzman Mehmet",
    date: "2024-03-08",
    views: 0,
    comments: 0,
  },
]

export default function ContentManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [isAddContentOpen, setIsAddContentOpen] = useState(false)
  const [selectedContent, setSelectedContent] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("recipes")

  const [newContent, setNewContent] = useState({
    title: "",
    category: "",
    content: "",
    status: "draft",
    tags: "",
  })

  const handleAddContent = () => {
    console.log("Adding content:", newContent)
    setIsAddContentOpen(false)
    setNewContent({ title: "", category: "", content: "", status: "draft", tags: "" })
  }

  const handleStatusChange = (id: number, newStatus: string) => {
    console.log(`Changing content ${id} status to ${newStatus}`)
  }

  const handleDeleteContent = (id: number) => {
    console.log(`Deleting content ${id}`)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <Badge variant="default">Yayında</Badge>
      case "draft":
        return <Badge variant="secondary">Taslak</Badge>
      case "review":
        return <Badge variant="destructive">İnceleme</Badge>
      case "archived":
        return <Badge variant="outline">Arşiv</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">İçerik Yönetimi</h1>
            <p className="text-muted-foreground">Platform içeriğini yönetin ve düzenleyin</p>
          </div>
          <Dialog open={isAddContentOpen} onOpenChange={setIsAddContentOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Yeni İçerik
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Yeni İçerik Ekle</DialogTitle>
                <DialogDescription>Platforma yeni içerik ekleyin. Tüm alanları doldurun.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="title" className="text-right">
                    Başlık
                  </Label>
                  <Input
                    id="title"
                    value={newContent.title}
                    onChange={(e) => setNewContent({ ...newContent, title: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category" className="text-right">
                    Kategori
                  </Label>
                  <Select
                    value={newContent.category}
                    onValueChange={(value) => setNewContent({ ...newContent, category: value })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Kategori seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recipe">Tarif</SelectItem>
                      <SelectItem value="exercise">Egzersiz</SelectItem>
                      <SelectItem value="supplement">Supplement</SelectItem>
                      <SelectItem value="blog">Blog</SelectItem>
                      <SelectItem value="faq">FAQ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="content" className="text-right">
                    İçerik
                  </Label>
                  <Textarea
                    id="content"
                    value={newContent.content}
                    onChange={(e) => setNewContent({ ...newContent, content: e.target.value })}
                    className="col-span-3"
                    rows={6}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="tags" className="text-right">
                    Etiketler
                  </Label>
                  <Input
                    id="tags"
                    value={newContent.tags}
                    onChange={(e) => setNewContent({ ...newContent, tags: e.target.value })}
                    className="col-span-3"
                    placeholder="virgülle ayırın"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="status" className="text-right">
                    Durum
                  </Label>
                  <Select
                    value={newContent.status}
                    onValueChange={(value) => setNewContent({ ...newContent, status: value })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Taslak</SelectItem>
                      <SelectItem value="review">İnceleme</SelectItem>
                      <SelectItem value="published">Yayınla</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleAddContent}>
                  İçerik Ekle
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {contentStats.map((stat) => (
            <Card key={stat.name}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="recipes" className="flex items-center space-x-2">
              <ChefHat className="h-4 w-4" />
              <span>Tarifler</span>
            </TabsTrigger>
            <TabsTrigger value="exercises" className="flex items-center space-x-2">
              <Dumbbell className="h-4 w-4" />
              <span>Egzersizler</span>
            </TabsTrigger>
            <TabsTrigger value="supplements" className="flex items-center space-x-2">
              <Pill className="h-4 w-4" />
              <span>Supplementler</span>
            </TabsTrigger>
            <TabsTrigger value="blog" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Blog</span>
            </TabsTrigger>
            <TabsTrigger value="faq" className="flex items-center space-x-2">
              <HelpCircle className="h-4 w-4" />
              <span>FAQ</span>
            </TabsTrigger>
          </TabsList>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="İçerik ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Durum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Durumlar</SelectItem>
                    <SelectItem value="published">Yayında</SelectItem>
                    <SelectItem value="draft">Taslak</SelectItem>
                    <SelectItem value="review">İnceleme</SelectItem>
                    <SelectItem value="archived">Arşiv</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Kategoriler</SelectItem>
                    <SelectItem value="breakfast">Kahvaltı</SelectItem>
                    <SelectItem value="lunch">Öğle</SelectItem>
                    <SelectItem value="dinner">Akşam</SelectItem>
                    <SelectItem value="snack">Atıştırmalık</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <TabsContent value="recipes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tarifler</CardTitle>
                <CardDescription>Beslenme tarifleri ve yemek önerileri</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tarif</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>Yazar</TableHead>
                        <TableHead>Görüntülenme</TableHead>
                        <TableHead>Tarih</TableHead>
                        <TableHead className="text-right">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recipes.map((recipe) => (
                        <TableRow key={recipe.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-10 w-10 rounded-md">
                                <AvatarImage src={recipe.image || "/placeholder.svg"} />
                                <AvatarFallback>
                                  <ImageIcon className="h-4 w-4" />
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{recipe.title}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{recipe.category}</Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(recipe.status)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{recipe.author}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {recipe.views.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(recipe.date).toLocaleDateString("tr-TR")}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                                <DropdownMenuItem>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Görüntüle
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Düzenle
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleStatusChange(recipe.id, "published")}>
                                  Yayınla
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(recipe.id, "archived")}>
                                  Arşivle
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteContent(recipe.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Sil
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exercises" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Egzersizler</CardTitle>
                <CardDescription>Antrenman egzersizleri ve açıklamaları</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Egzersiz</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Zorluk</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>Yazar</TableHead>
                        <TableHead>Görüntülenme</TableHead>
                        <TableHead className="text-right">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {exercises.map((exercise) => (
                        <TableRow key={exercise.id}>
                          <TableCell className="font-medium">{exercise.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{exercise.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                exercise.difficulty === "Kolay"
                                  ? "default"
                                  : exercise.difficulty === "Orta"
                                    ? "secondary"
                                    : "destructive"
                              }
                            >
                              {exercise.difficulty}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(exercise.status)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{exercise.author}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {exercise.views.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                                <DropdownMenuItem>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Görüntüle
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Düzenle
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteContent(exercise.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Sil
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="supplements" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Supplementler</CardTitle>
                <CardDescription>Takviye ürünleri ve bilgileri</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ürün</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Marka</TableHead>
                        <TableHead>Fiyat</TableHead>
                        <TableHead>Stok</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead className="text-right">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplements.map((supplement) => (
                        <TableRow key={supplement.id}>
                          <TableCell className="font-medium">{supplement.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{supplement.category}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{supplement.brand}</TableCell>
                          <TableCell className="font-medium">{supplement.price}</TableCell>
                          <TableCell>
                            <Badge variant={supplement.stock > 0 ? "default" : "destructive"}>
                              {supplement.stock > 0 ? `${supplement.stock} adet` : "Tükendi"}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(supplement.status)}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                                <DropdownMenuItem>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Görüntüle
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Düzenle
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteContent(supplement.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Sil
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="blog" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Blog Yazıları</CardTitle>
                <CardDescription>Eğitici içerikler ve makaleler</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Başlık</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>Yazar</TableHead>
                        <TableHead>Görüntülenme</TableHead>
                        <TableHead>Yorum</TableHead>
                        <TableHead className="text-right">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {blogPosts.map((post) => (
                        <TableRow key={post.id}>
                          <TableCell className="font-medium">{post.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{post.category}</Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(post.status)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{post.author}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{post.views.toLocaleString()}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{post.comments}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                                <DropdownMenuItem>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Görüntüle
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Düzenle
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteContent(post.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Sil
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="faq" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sık Sorulan Sorular</CardTitle>
                <CardDescription>Kullanıcı destek içerikleri</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">FAQ İçerikleri</h3>
                  <p className="text-muted-foreground mb-4">Henüz FAQ içeriği bulunmuyor.</p>
                  <Button>İlk FAQ'ı Ekle</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}
