"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import ResponsiveLayout from "@/components/responsive-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Send,
  Calendar,
  Clock,
  Phone,
  Mail,
  MessageSquare,
  Target,
  Heart,
  AlertTriangle,
  CheckCircle,
  Upload,
  User,
  X,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"

export default function PTFormuPage() {
  const { data: session } = useSession()
  const router = useRouter()

  const [formData, setFormData] = useState({
    // PT'ye özel bilgiler
    bodyPhotos: null as File[] | null,
    
    // Sağlık ve yaşam tarzı
    healthConditions: '',
    injuries: '',
    medications: '',
    workoutLocation: '',
    equipmentAvailable: '',
    equipmentPhotos: null as File[] | null,
    workoutDaysPerWeek: '',
    experience: 'beginner',
    mealFrequency: '',
    dietRestrictions: '',
    jobDetails: '',
    trainingExpectations: '',
    sportHistory: '',
    lastTrainingProgram: '',

    // Acil durum bilgileri
    emergencyContactName: '',
    emergencyContactPhone: '',

    // Özel istekler
    specialRequests: '',

    // Sözleşme onayı
    agreedToTerms: false
  })

  const [existingFormId, setExistingFormId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [existingBodyPhotos, setExistingBodyPhotos] = useState<string[]>([])
  const [existingEquipmentPhotos, setExistingEquipmentPhotos] = useState<string[]>([])
  const [removedBodyPhotos, setRemovedBodyPhotos] = useState<Set<string>>(new Set())
  const [removedEquipmentPhotos, setRemovedEquipmentPhotos] = useState<Set<string>>(new Set())
  const [previewBodyPhotos, setPreviewBodyPhotos] = useState<string[]>([])
  const [previewEquipmentPhotos, setPreviewEquipmentPhotos] = useState<string[]>([])

  useEffect(() => {
    const fetchExisting = async () => {
      try {
        const res = await fetch('/api/pt-form', { method: 'GET' })
        if (res.status === 403) {
          window.location.href = '/paket-satin-al?source=pt-formu'
          return
        }
        if (res.ok) {
          const data = await res.json()
          setExistingFormId(data.id)
          setExistingBodyPhotos(Array.isArray(data.bodyPhotos) ? data.bodyPhotos : [])
          setExistingEquipmentPhotos(Array.isArray(data.equipmentPhotos) ? data.equipmentPhotos : [])
          setFormData(prev => ({
            ...prev,
            bodyPhotos: null,
            healthConditions: data.healthConditions || '',
            injuries: data.injuries || '',
            medications: data.medications || '',
            workoutLocation: data.workoutLocation || '',
            equipmentAvailable: data.equipmentAvailable || '',
            equipmentPhotos: null,
            workoutDaysPerWeek: data.workoutDaysPerWeek?.toString() || '',
            experience: data.experience || 'beginner',
            mealFrequency: data.mealFrequency?.toString() || '',
            dietRestrictions: data.dietRestrictions || '',
            jobDetails: data.jobDetails || '',
            trainingExpectations: data.trainingExpectations || '',
            sportHistory: data.sportHistory || '',
            lastTrainingProgram: data.lastTrainingProgram || '',
            emergencyContactName: data.emergencyContactName || '',
            emergencyContactPhone: data.emergencyContactPhone || '',
            specialRequests: data.specialRequests || '',
            agreedToTerms: !!data.agreedToTerms,
          }))
        }
      } catch (e) {
        // ignore
      } finally {
        setIsLoading(false)
      }
    }
    if (session) fetchExisting()
  }, [session])

  // Seçilen dosyalar için oluşturulan objectURL'leri temizlikte serbest bırak
  useEffect(() => {
    return () => {
      previewBodyPhotos.forEach((u) => URL.revokeObjectURL(u))
      previewEquipmentPhotos.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [previewBodyPhotos, previewEquipmentPhotos])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'bodyPhotos' | 'equipmentPhotos') => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files)
      setFormData(prev => ({
        ...prev,
        [field]: filesArray
      }))
      const newPreviews = filesArray.map((f) => URL.createObjectURL(f))
      if (field === 'bodyPhotos') {
        setPreviewBodyPhotos((prev) => {
          // önceki objectURL'leri serbest bırak
          prev.forEach((u) => URL.revokeObjectURL(u))
          return newPreviews
        })
      } else {
        setPreviewEquipmentPhotos((prev) => {
          prev.forEach((u) => URL.revokeObjectURL(u))
          return newPreviews
        })
      }
    }
  }

  const removeExistingPhoto = (type: 'body' | 'equipment', src: string) => {
    if (type === 'body') {
      setRemovedBodyPhotos(prev => {
        const next = new Set(prev)
        next.add(src)
        return next
      })
    } else {
      setRemovedEquipmentPhotos(prev => {
        const next = new Set(prev)
        next.add(src)
        return next
      })
    }
  }

  const handleButtonSelect = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Zorunlu alan kontrolü
    const requiredFields = [
      'workoutLocation', 'workoutDaysPerWeek', 'agreedToTerms'
    ]

    for (const field of requiredFields) {
      if (!formData[field as keyof typeof formData]) {
        toast({
          title: "Hata",
          description: `Lütfen ${field} alanını doldurunuz.`,
          variant: "destructive"
        })
        return
      }
    }

    try {
      // Fotoğrafları base64'e çevirme
      const bodyPhotosBase64 = formData.bodyPhotos 
        ? await Promise.all(formData.bodyPhotos.map(fileToBase64)) 
        : null
      const equipmentPhotosBase64 = formData.equipmentPhotos 
        ? await Promise.all(formData.equipmentPhotos.map(fileToBase64)) 
        : null

      const isUpdating = !!existingFormId
      const keptExistingBody = existingBodyPhotos.filter((src) => !removedBodyPhotos.has(src))
      const keptExistingEquipment = existingEquipmentPhotos.filter((src) => !removedEquipmentPhotos.has(src))
      const finalBodyPhotos = isUpdating ? [...keptExistingBody, ...(bodyPhotosBase64 || [])] : bodyPhotosBase64
      const finalEquipmentPhotos = isUpdating ? [...keptExistingEquipment, ...(equipmentPhotosBase64 || [])] : equipmentPhotosBase64
      const response = await fetch('/api/pt-form', {
        method: isUpdating ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: existingFormId || undefined,
          ...formData,
          bodyPhotos: finalBodyPhotos ?? undefined,
          equipmentPhotos: finalEquipmentPhotos ?? undefined
        })
      })

      if (response.status === 403) {
        window.location.href = '/paket-satin-al?source=pt-formu'
        return
      }

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Başarılı",
          description: isUpdating ? "PT formunuz güncellendi." : "PT formunuz başarıyla gönderildi.",
          variant: "default"
        })
        // Form gönderildikten sonra yönlendirme veya başka bir işlem
        router.push('/bilgilerim')
      } else {
        toast({
          title: "Hata",
          description: result.error || "Form gönderilirken bir hata oluştu.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('PT Form submit error:', error)
      toast({
        title: "Hata",
        description: "Bir sorun oluştu. Lütfen daha sonra tekrar deneyin.",
        variant: "destructive"
      })
    }
  }

  // Dosyayı base64'e çeviren yardımcı fonksiyon
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })
  }

  // Oturum açılmamışsa login sayfasına yönlendir
  if (!session) {
    router.push('/login')
    return null
  }

  if (isLoading) {
    return (
      <ResponsiveLayout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center">Yükleniyor...</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </ResponsiveLayout>
    )
  }

  return (
    <ResponsiveLayout>
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              {existingFormId ? 'PT Formunu Düzenle' : 'Kişisel Antrenör (PT) Formu'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-blue-800 text-sm">
                  <strong>Not:</strong> Kişisel bilgileriniz (ad, soyad, yaş, boy, kilo vb.) profil sayfanızdan alınacaktır.
                  Bu formda sadece PT'ye özel bilgileri doldurunuz.
                </p>
              </div>

              {/* Vücut Fotoğrafları */}
              <div>
                <Label className="mb-2 block">Vücut Fotoğrafları</Label>
                {existingBodyPhotos.length > 0 && (
                  <div className="mb-3 grid grid-cols-3 gap-3">
                    {existingBodyPhotos
                      .filter((src) => !removedBodyPhotos.has(src))
                      .map((src, idx) => (
                        <div key={`body-existing-${idx}`} className="relative border rounded-md overflow-hidden">
                          <img src={src} alt={`vücut-${idx}`} className="w-full h-24 object-cover" />
                          <button
                            type="button"
                            onClick={() => removeExistingPhoto('body', src)}
                            className="absolute top-1 right-1 inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/90 text-red-600 shadow hover:bg-white"
                            aria-label="Fotoğrafı kaldır"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                  </div>
                )}
                {previewBodyPhotos.length > 0 && (
                  <div className="mb-3 grid grid-cols-3 gap-3">
                    {previewBodyPhotos.map((src, idx) => (
                      <div key={`body-preview-${idx}`} className="border rounded-md overflow-hidden ring-2 ring-blue-200">
                        <img src={src} alt={`seçili-vücut-${idx}`} className="w-full h-24 object-cover" />
                      </div>
                    ))}
                  </div>
                )}
                <Input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'bodyPhotos')}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              {/* Sağlık Bilgileri */}
              <div>
                <Label htmlFor="healthConditions" className="mb-2 block">
                  Herhangi bir sağlık sorunu var mı?
                </Label>
                <Textarea
                  id="healthConditions"
                  name="healthConditions"
                  value={formData.healthConditions}
                  onChange={handleInputChange}
                  className="border-2 border-gray-300 focus:border-blue-500 bg-white"
                  placeholder="Varsa detayları yazın"
                />
              </div>

              <div>
                <Label htmlFor="injuries" className="mb-2 block">
                  Herhangi bir sakatlık veya hareket kısıtlılığı var mı?
                </Label>
                <Textarea
                  id="injuries"
                  name="injuries"
                  value={formData.injuries}
                  onChange={handleInputChange}
                  className="border-2 border-gray-300 focus:border-blue-500 bg-white"
                  placeholder="Varsa detayları yazın"
                />
              </div>

              <div>
                <Label htmlFor="medications" className="mb-2 block">
                  Düzenli kullandığınız ilaç var mı?
                </Label>
                <Textarea
                  id="medications"
                  name="medications"
                  value={formData.medications}
                  onChange={handleInputChange}
                  className="border-2 border-gray-300 focus:border-blue-500 bg-white"
                  placeholder="Varsa detayları yazın"
                />
              </div>

              {/* Antrenman Lokasyonu */}
              <div>
                <Label className="mb-2 block">Antrenman nerede yapılacak?</Label>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={formData.workoutLocation === 'home' ? 'default' : 'outline'}
                    onClick={() => handleButtonSelect('workoutLocation', 'home')}
                  >
                    Evde
                  </Button>
                  <Button
                    type="button"
                    variant={formData.workoutLocation === 'gym' ? 'default' : 'outline'}
                    onClick={() => handleButtonSelect('workoutLocation', 'gym')}
                  >
                    Spor Salonunda
                  </Button>
                </div>
              </div>

              {/* Ekipman Durumu */}
              {formData.workoutLocation === 'home' && (
                <div>
                  <Label className="mb-2 block">Evde ekipman var mı?</Label>
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant={formData.equipmentAvailable === 'withEquipment' ? 'default' : 'outline'}
                      onClick={() => handleButtonSelect('equipmentAvailable', 'withEquipment')}
                    >
                      Ekipmanla
                    </Button>
                    <Button
                      type="button"
                      variant={formData.equipmentAvailable === 'withoutEquipment' ? 'default' : 'outline'}
                      onClick={() => handleButtonSelect('equipmentAvailable', 'withoutEquipment')}
                    >
                      Ekipman Yok
                    </Button>
                  </div>
                </div>
              )}

              {formData.equipmentAvailable === 'withEquipment' && (
                <div>
                  <Label className="mb-2 block">Ekipman Fotoğrafları</Label>
                  {existingEquipmentPhotos.length > 0 && (
                    <div className="mb-3 grid grid-cols-3 gap-3">
                      {existingEquipmentPhotos
                        .filter((src) => !removedEquipmentPhotos.has(src))
                        .map((src, idx) => (
                          <div key={`equip-existing-${idx}`} className="relative border rounded-md overflow-hidden">
                            <img src={src} alt={`ekipman-${idx}`} className="w-full h-24 object-cover" />
                            <button
                              type="button"
                              onClick={() => removeExistingPhoto('equipment', src)}
                              className="absolute top-1 right-1 inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/90 text-red-600 shadow hover:bg-white"
                              aria-label="Fotoğrafı kaldır"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                  {previewEquipmentPhotos.length > 0 && (
                    <div className="mb-3 grid grid-cols-3 gap-3">
                      {previewEquipmentPhotos.map((src, idx) => (
                        <div key={`equip-preview-${idx}`} className="border rounded-md overflow-hidden ring-2 ring-blue-200">
                          <img src={src} alt={`seçili-ekipman-${idx}`} className="w-full h-24 object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                  <Input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'equipmentPhotos')}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              )}

              {/* Antrenman Sıklığı */}
              <div>
                <Label htmlFor="workoutDaysPerWeek" className="mb-2 block">Haftada maksimum kaç gün spora gidebilirsiniz?</Label>
                <Input
                  type="number"
                  id="workoutDaysPerWeek"
                  name="workoutDaysPerWeek"
                  value={formData.workoutDaysPerWeek}
                  onChange={handleInputChange}
                  className="border-2 border-gray-300 focus:border-blue-500 bg-white"
                  required
                />
              </div>

              {/* Deneyim Seviyesi */}
              <div>
                <Label className="mb-2 block">Spor deneyim seviyeniz nedir?</Label>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={formData.experience === 'beginner' ? 'default' : 'outline'}
                    onClick={() => handleButtonSelect('experience', 'beginner')}
                  >
                    Başlangıç
                  </Button>
                  <Button
                    type="button"
                    variant={formData.experience === 'intermediate' ? 'default' : 'outline'}
                    onClick={() => handleButtonSelect('experience', 'intermediate')}
                  >
                    Orta
                  </Button>
                  <Button
                    type="button"
                    variant={formData.experience === 'advanced' ? 'default' : 'outline'}
                    onClick={() => handleButtonSelect('experience', 'advanced')}
                  >
                    İleri
                  </Button>
                  <Button
                    type="button"
                    variant={formData.experience === 'expert' ? 'default' : 'outline'}
                    onClick={() => handleButtonSelect('experience', 'expert')}
                  >
                    Uzman
                  </Button>
                </div>
              </div>

              {/* Beslenme ve Yaşam Tarzı */}
              <div>
                <Label htmlFor="mealFrequency" className="mb-2 block">Günde kaç öğün yazsam tüketme olasılığınız var?</Label>
                <Input
                  type="number"
                  id="mealFrequency"
                  name="mealFrequency"
                  value={formData.mealFrequency}
                  onChange={handleInputChange}
                  className="border-2 border-gray-300 focus:border-blue-500 bg-white"
                />
              </div>

              <div>
                <Label htmlFor="dietRestrictions" className="mb-2 block">Beslenme kısıtlamalarınız var mı?</Label>
                <Textarea
                  id="dietRestrictions"
                  name="dietRestrictions"
                  value={formData.dietRestrictions}
                  onChange={handleInputChange}
                  className="border-2 border-gray-300 focus:border-blue-500 bg-white"
                  placeholder="Alerjiler, vejeteryan, vegan vb."
                />
              </div>

              <div>
                <Label htmlFor="jobDetails" className="mb-2 block">Tam olarak detaylı şekilde ne iş yapıyorsunuz?</Label>
                <Textarea
                  id="jobDetails"
                  name="jobDetails"
                  value={formData.jobDetails}
                  onChange={handleInputChange}
                  className="border-2 border-gray-300 focus:border-blue-500 bg-white"
                />
              </div>

              <div>
                <Label htmlFor="trainingExpectations" className="mb-2 block">Bu eğitimden beklentileriniz neler?</Label>
                <Textarea
                  id="trainingExpectations"
                  name="trainingExpectations"
                  value={formData.trainingExpectations}
                  onChange={handleInputChange}
                  className="border-2 border-gray-300 focus:border-blue-500 bg-white"
                />
              </div>

              <div>
                <Label htmlFor="sportHistory" className="mb-2 block">Spor geçmişinizi anlatın</Label>
                <Textarea
                  id="sportHistory"
                  name="sportHistory"
                  value={formData.sportHistory}
                  onChange={handleInputChange}
                  className="border-2 border-gray-300 focus:border-blue-500 bg-white"
                />
              </div>

              <div>
                <Label htmlFor="lastTrainingProgram" className="mb-2 block">Varsa son antrenman programınızı yazın</Label>
                <Textarea
                  id="lastTrainingProgram"
                  name="lastTrainingProgram"
                  value={formData.lastTrainingProgram}
                  onChange={handleInputChange}
                  className="border-2 border-gray-300 focus:border-blue-500 bg-white"
                />
              </div>


              {/* Özel İstekler */}
              <div>
                <Label htmlFor="specialRequests" className="mb-2 block">Özel İstekler veya Notlar</Label>
                <Textarea
                  id="specialRequests"
                  name="specialRequests"
                  value={formData.specialRequests}
                  onChange={handleInputChange}
                  className="border-2 border-gray-300 focus:border-blue-500 bg-white"
                  placeholder="Varsa özel isteklerinizi veya notlarınızı yazın"
                />
              </div>

              {/* Sözleşme Onayı */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="agreedToTerms"
                  checked={formData.agreedToTerms}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    agreedToTerms: !!checked
                  }))}
                />
                <Label
                  htmlFor="agreedToTerms"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Üyelik sözleşmesini okudum ve kabul ediyorum
                </Label>
              </div>

              {/* Gönder / Güncelle Butonu */}
              <div className="flex justify-center">
                <Button 
                  type="submit" 
                  className="w-full max-w-md"
                  disabled={!formData.agreedToTerms}
                >
                  <Send className="mr-2 h-4 w-4" /> {existingFormId ? 'Formu Güncelle' : 'Formu Gönder'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </ResponsiveLayout>
  )
}
