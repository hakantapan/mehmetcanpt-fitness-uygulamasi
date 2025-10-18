'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Dumbbell, Shield, ArrowRight, Activity, BarChart3, Settings, LogIn, UserPlus, LogOut } from "lucide-react"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function PanelSelector() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Kullanıcı giriş yaptıysa rolüne göre yönlendir
  useEffect(() => {
    if (status === 'loading') return
    
    if (session?.user) {
      switch (session.user.role) {
        case 'CLIENT':
          router.push('/bilgilerim')
          break
        case 'TRAINER':
          router.push('/egitmen')
          break
        case 'ADMIN':
          router.push('/admin')
          break
      }
    }
  }, [session, status, router])

  // Yükleniyor durumu
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  // Giriş yapmamış kullanıcılar için
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container mx-auto px-4 py-12">
          {/* Admin çıkış için geçici buton */}
          <div className="fixed top-4 right-4 z-50">
            <Button
              variant="outline"
              onClick={() => signOut({ callbackUrl: '/login', redirect: true })}
              className="bg-red-100 border-red-300 text-red-700 hover:bg-red-200"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Çıkış Yap
            </Button>
          </div>
          
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
                <Dumbbell className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Fitness Yönetim Sistemi</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Profesyonel fitness takibi ve kişisel gelişim platformu
            </p>
            
            {/* Giriş/Kayıt Butonları */}
            <div className="flex gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/login" className="flex items-center gap-2">
                  <LogIn className="w-5 h-5" />
                  Giriş Yap
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/register" className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Kayıt Ol
                </Link>
              </Button>
            </div>
            
            {/* Test Bilgileri */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">🧪 Test Hesapları:</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>Admin:</strong> admin@fitness.com - Şifre: 123456</p>
                <p><strong>Eğitmen:</strong> egitmen@fitness.com - Şifre: 123456</p>
                <p><strong>Danışan:</strong> danisan@fitness.com - Şifre: 123456</p>
              </div>
            </div>
          </div>

          {/* Panel Cards - Bilgilendirme amaçlı */}
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mt-16">
            {/* Danışan Paneli */}
            <Card className="opacity-75">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl text-gray-900">Danışan Paneli</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 text-center mb-6">
                  Kişisel fitness yolculuğunuzu takip edin, antrenman programlarınızı görüntüleyin ve ilerlemenizi
                  izleyin.
                </p>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <Activity className="w-4 h-4 text-red-500" />
                    <span>Antrenman Programları</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <BarChart3 className="w-4 h-4 text-red-500" />
                    <span>Vücut Analizi & İlerleme</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <Settings className="w-4 h-4 text-red-500" />
                    <span>Beslenme & Supplement</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Eğitmen Paneli */}
            <Card className="opacity-75">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Dumbbell className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl text-gray-900">Eğitmen Paneli</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 text-center mb-6">
                  Danışanlarınızı yönetin, program oluşturun ve gelişimlerini takip edin.
                </p>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span>Danışan Yönetimi</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <Activity className="w-4 h-4 text-blue-500" />
                    <span>Program Oluşturma</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                    <span>Performans Takibi</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Admin Paneli */}
            <Card className="opacity-75">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl text-gray-900">Admin Paneli</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 text-center mb-6">
                  Tüm sistemi yönetin, kullanıcıları kontrol edin ve raporları görüntüleyin.
                </p>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <Users className="w-4 h-4 text-purple-500" />
                    <span>Kullanıcı Yönetimi</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <BarChart3 className="w-4 h-4 text-purple-500" />
                    <span>Sistem Raporları</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <Settings className="w-4 h-4 text-purple-500" />
                    <span>Platform Ayarları</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Giriş yapmış kullanıcı yönlendiriliyor
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Yönlendiriliyorsunuz...</p>
      </div>
    </div>
  )
}