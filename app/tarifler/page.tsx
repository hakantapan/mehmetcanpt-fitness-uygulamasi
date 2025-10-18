"use client"

import { useEffect, useMemo, useState, type ComponentType } from "react"
import ResponsiveLayout from "@/components/responsive-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Clock,
  Users,
  Heart,
  Star,
  ChefHat,
  Coffee,
  Utensils,
  Apple,
  Zap,
  ArrowLeft,
} from "lucide-react"

type Recipe = {
  id: string
  name: string
  category: string
  icon: string
  image: string
  prepTime: number
  servings: number
  difficulty: string
  rating: number
  calories: number
  protein: number
  carbs: number
  fat: number
  tags: string[]
  ingredients: Array<{ name: string; amount: string }>
  instructions: string[]
  tips?: string
}

type Category = {
  id: string
  name: string
  icon: string
}

type ApiResponse = {
  recipes: Recipe[]
}

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  chef: ChefHat,
  coffee: Coffee,
  utensils: Utensils,
  apple: Apple,
  zap: Zap,
}

const normalizeCategoryId = (label: string) =>
  label.toLowerCase().replace(/[^a-z0-9]+/gi, "-")

export default function TariflerPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null)

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch("/api/static/recipes", { cache: "no-cache" })
        if (!response.ok) {
          const message = await response.text()
          throw new Error(message || "Tarif verileri alınamadı.")
        }
        const data = (await response.json()) as ApiResponse
        setRecipes(Array.isArray(data.recipes) ? data.recipes : [])
      } catch (fetchError) {
        console.error("Tarif verileri alınırken hata:", fetchError)
        setError(fetchError instanceof Error ? fetchError.message : "Tarifler yüklenemedi.")
      } finally {
        setLoading(false)
      }
    }

    void fetchRecipes()
  }, [])

  const categories = useMemo<Category[]>(() => {
    const collection = new Map<string, { name: string; icon: string }>()
    recipes.forEach((recipe) => {
      const id = normalizeCategoryId(recipe.category)
      if (!collection.has(id)) {
        collection.set(id, {
          name: recipe.category,
          icon: recipe.icon || "chef",
        })
      }
    })

    return [
      { id: "all", name: "Tümü", icon: "chef" },
      ...Array.from(collection.entries()).map(([id, value]) => ({
        id,
        name: value.name,
        icon: value.icon,
      })),
    ]
  }, [recipes])

  useEffect(() => {
    if (selectedCategory === "all") return
    const categoryExists = categories.some((category) => category.id === selectedCategory)
    if (!categoryExists) {
      setSelectedCategory("all")
    }
  }, [categories, selectedCategory])

  const filteredRecipes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return recipes.filter((recipe) => {
      const matchesCategory =
        selectedCategory === "all" || normalizeCategoryId(recipe.category) === selectedCategory
      const matchesQuery =
        query.length === 0 ||
        recipe.name.toLowerCase().includes(query) ||
        recipe.tags.some((tag) => tag.toLowerCase().includes(query))
      return matchesCategory && matchesQuery
    })
  }, [recipes, selectedCategory, searchQuery])

  const selectedRecipeData = selectedRecipe
    ? recipes.find((recipe) => recipe.id === selectedRecipe)
    : null

  if (selectedRecipeData) {
    const Icon = iconMap[selectedRecipeData.icon] || ChefHat
    return (
      <ResponsiveLayout>
        <div className="space-y-6">
          <Button variant="ghost" className="gap-2 px-0" onClick={() => setSelectedRecipe(null)}>
            <ArrowLeft className="w-4 h-4" />
            Geri Dön
          </Button>

          <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
            <Card className="overflow-hidden">
              <div className="relative">
                <img
                  src={selectedRecipeData.image || "/placeholder.svg"}
                  alt={selectedRecipeData.name}
                  className="w-full h-72 object-cover"
                />
                <Badge className="absolute top-4 left-4 flex items-center gap-1 bg-red-600 hover:bg-red-600">
                  <Icon className="w-4 h-4" />
                  {selectedRecipeData.category}
                </Badge>
              </div>
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="text-2xl">{selectedRecipeData.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="font-medium">{selectedRecipeData.rating.toFixed(1)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {selectedRecipeData.prepTime} dk
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {selectedRecipeData.servings} porsiyon
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    {selectedRecipeData.difficulty}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Besin Değerleri</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="rounded-lg border bg-gray-50 p-3 text-center">
                      <div className="text-xs text-gray-500">Kalori</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {selectedRecipeData.calories} kcal
                      </div>
                    </div>
                    <div className="rounded-lg border bg-gray-50 p-3 text-center">
                      <div className="text-xs text-gray-500">Protein</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {selectedRecipeData.protein} g
                      </div>
                    </div>
                    <div className="rounded-lg border bg-gray-50 p-3 text-center">
                      <div className="text-xs text-gray-500">Karbonhidrat</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {selectedRecipeData.carbs} g
                      </div>
                    </div>
                    <div className="rounded-lg border bg-gray-50 p-3 text-center">
                      <div className="text-xs text-gray-500">Yağ</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {selectedRecipeData.fat} g
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Malzemeler</h3>
                  <div className="grid md:grid-cols-2 gap-2">
                    {selectedRecipeData.ingredients.map((ingredient) => (
                      <div
                        key={`${selectedRecipeData.id}-${ingredient.name}`}
                        className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm"
                      >
                        <span>{ingredient.name}</span>
                        <span className="text-gray-500">{ingredient.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Hazırlanışı</h3>
                  <div className="space-y-3">
                    {selectedRecipeData.instructions.map((step, index) => (
                      <div key={index} className="flex gap-3 rounded-lg border bg-white p-3">
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-medium text-white">
                          {index + 1}
                        </div>
                        <p className="text-sm text-gray-700">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedRecipeData.tips ? (
                  <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
                    <div className="mb-1 font-medium text-blue-800">💡 İpucu</div>
                    {selectedRecipeData.tips}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Etiketler</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {selectedRecipeData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </ResponsiveLayout>
    )
  }

  return (
    <ResponsiveLayout>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tarifler</h1>
            <p className="text-gray-600">Fitness hedeflerinize uygun seçilmiş tarifler</p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Tarif ara veya etiket yaz..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 gap-2 md:grid-cols-5">
            {categories.map((category) => {
              const Icon = iconMap[category.icon] || ChefHat
              return (
                <TabsTrigger key={category.id} value={category.id} className="gap-2 px-3 py-1.5">
                  <Icon className="h-4 w-4" />
                  {category.name}
                </TabsTrigger>
              )
            })}
          </TabsList>

          <TabsContent value={selectedCategory} className="space-y-4">
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Card key={`recipe-skeleton-${index}`} className="flex h-full animate-pulse flex-col overflow-hidden">
                    <div className="h-48 w-full bg-gray-200" />
                    <CardContent className="flex flex-1 flex-col justify-between space-y-3 px-5 pb-5">
                      <div className="h-5 w-40 rounded bg-gray-200" />
                        <div className="h-4 w-24 rounded bg-gray-200" />
                        <div className="h-4 w-full rounded bg-gray-200" />
                        <div className="h-4 w-3/4 rounded bg-gray-200" />
                      </CardContent>
                  </Card>
                ))}
              </div>
            ) : error ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-destructive">{error}</CardContent>
              </Card>
            ) : filteredRecipes.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <h3 className="mb-2 text-lg font-medium text-gray-900">Tarif bulunamadı</h3>
                  <p className="text-sm text-gray-500">
                    Arama kriterlerini değiştirerek tekrar deneyebilirsiniz.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredRecipes.map((recipe) => {
                  const Icon = iconMap[recipe.icon] || ChefHat
                  return (
                    <Card
                      key={recipe.id}
                      className="flex h-full cursor-pointer flex-col overflow-hidden transition-shadow hover:shadow-lg"
                      onClick={() => setSelectedRecipe(recipe.id)}
                    >
                      <div className="relative">
                        <img
                          src={recipe.image || "/placeholder.svg"}
                          alt={recipe.name}
                          className="h-48 w-full rounded-t-lg object-cover"
                        />
                        <Badge className="absolute left-4 top-4 flex items-center gap-1 bg-red-600 hover:bg-red-600">
                          <Icon className="h-4 w-4" />
                          {recipe.category}
                        </Badge>
                        <div className="absolute bottom-0 left-0 flex w-full items-center justify-between bg-black/50 px-4 py-2 text-xs text-white backdrop-blur">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {recipe.prepTime} dk
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {recipe.servings}
                          </div>
                        </div>
                      </div>
                      <CardContent className="flex flex-1 flex-col justify-between space-y-3 px-5 pb-5">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-lg font-semibold text-gray-900">{recipe.name}</div>
                              <div className="text-xs text-gray-500">{recipe.difficulty}</div>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-yellow-500">
                              <Star className="h-4 w-4" />
                              {recipe.rating.toFixed(1)}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <div className="rounded-lg bg-red-50 px-3 py-2 text-center text-xs text-red-600">
                              <div className="font-semibold">{recipe.calories}</div>
                              <div className="text-[10px] uppercase tracking-wide">kcal</div>
                            </div>
                            <div className="rounded-lg bg-green-50 px-3 py-2 text-center text-xs text-green-700">
                              <div className="font-semibold">{recipe.protein}g</div>
                              <div className="text-[10px] uppercase tracking-wide">protein</div>
                            </div>
                            <div className="rounded-lg bg-blue-50 px-3 py-2 text-center text-xs text-blue-700">
                              <div className="font-semibold">{recipe.carbs}g</div>
                              <div className="text-[10px] uppercase tracking-wide">karbonhidrat</div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {recipe.tags.slice(0, 3).map((tag) => (
                            <Badge key={`${recipe.id}-${tag}`} variant="outline" className="text-[10px]">
                              {tag}
                            </Badge>
                          ))}
                        </div>
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
