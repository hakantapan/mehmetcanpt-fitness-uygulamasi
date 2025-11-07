'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedPackageSlug = searchParams.get('paket')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    gender: '',
    age: '',
    height: '',
    weight: '',
    targetWeight: '',
    activityLevel: 'Orta',
    fitnessGoal: 'Kilo Verme'
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted, preventDefault called')
    setError('')
    setIsLoading(true)
    console.log('Form data:', formData)

    // Şifre kontrolü
    if (formData.password !== formData.confirmPassword) {
      setError('Şifreler eşleşmiyor')
      setIsLoading(false)
      return
    }

    try {
      const requestBody = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
        gender: formData.gender || undefined,
        age: formData.age ? parseInt(formData.age) : undefined,
        height: formData.height ? parseFloat(formData.height) : undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        targetWeight: formData.targetWeight ? parseFloat(formData.targetWeight) : undefined,
        activityLevel: formData.activityLevel,
        fitnessGoal: formData.fitnessGoal
      }
      
      console.log('Sending request to /api/auth/register with body:', requestBody)
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()
      console.log('Response status:', response.status)
      console.log('Response data:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Kayıt sırasında bir hata oluştu')
      }

      // Başarılı kayıt sonrası email doğrulama mesajı göster
      if (data.needsEmailVerification) {
        alert(`Kayıt başarılı! Email doğrulama bağlantısı console'da gösterildi.\n\nGeliştirme ortamında email gönderimi yapılmıyor, bu yüzden doğrulama linki console'da görüntüleniyor.\n\nEmail doğrulamadan sonra giriş yapabilirsiniz.`)
        // Development için doğrulama URL'sini göster
        if (data.verificationUrl) {
          console.log('Email Doğrulama Linki:', data.verificationUrl)
        }
      }
      
      if (selectedPackageSlug) {
        try {
          window.localStorage.setItem('pendingPackageSelection', selectedPackageSlug)
        } catch (_error) {
          // localStorage kullanılamıyorsa sessizce geç
        }
      }

      const loginParams = new URLSearchParams()
      loginParams.set('registered', 'true')
      if (selectedPackageSlug) {
        loginParams.set('callbackUrl', `/paket-satin-al?paket=${selectedPackageSlug}`)
      }

      router.push(`/login?${loginParams.toString()}`)
    } catch (error: any) {
      setError(error.message || 'Bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        <div className="p-6 space-y-1">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">Kayıt Ol</h2>
          <p className="text-center text-gray-600 dark:text-gray-400">
            Fitness yolculuğunuza başlamak için hesap oluşturun
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <p>{error}</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Hesap Bilgileri */}
            <div className="space-y-2 md:col-span-2">
              <h3 className="font-medium text-lg text-gray-900 dark:text-white">Hesap Bilgileri</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    E-posta <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="ornek@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Telefon
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+90 555 123 4567"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Şifre <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Şifre Tekrar <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            
            {/* Kişisel Bilgiler */}
            <div className="space-y-2 md:col-span-2">
              <h3 className="font-medium text-lg text-gray-900 dark:text-white">Kişisel Bilgiler</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Ad <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    placeholder="Adınız"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Soyad <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    placeholder="Soyadınız"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cinsiyet
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Cinsiyet seçin</option>
                    <option value="Erkek">Erkek</option>
                    <option value="Kadın">Kadın</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="age" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Yaş
                  </label>
                  <input
                    id="age"
                    name="age"
                    type="number"
                    placeholder="25"
                    value={formData.age}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            
            {/* Fiziksel Özellikler */}
            <div className="space-y-2 md:col-span-2">
              <h3 className="font-medium text-lg text-gray-900 dark:text-white">Fiziksel Özellikler</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label htmlFor="height" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Boy (cm)
                  </label>
                  <input
                    id="height"
                    name="height"
                    type="number"
                    placeholder="175"
                    value={formData.height}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="weight" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Kilo (kg)
                  </label>
                  <input
                    id="weight"
                    name="weight"
                    type="number"
                    placeholder="70"
                    value={formData.weight}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="targetWeight" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Hedef Kilo (kg)
                  </label>
                  <input
                    id="targetWeight"
                    name="targetWeight"
                    type="number"
                    placeholder="65"
                    value={formData.targetWeight}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            
            {/* Fitness Hedefleri */}
            <div className="space-y-2 md:col-span-2">
              <h3 className="font-medium text-lg text-gray-900 dark:text-white">Fitness Hedefleri</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="activityLevel" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Aktivite Seviyesi
                  </label>
                  <select
                    id="activityLevel"
                    name="activityLevel"
                    value={formData.activityLevel}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Düşük">Düşük (Az veya hiç egzersiz yapmıyorum)</option>
                    <option value="Orta">Orta (Haftada 1-3 gün egzersiz yapıyorum)</option>
                    <option value="Yüksek">Yüksek (Haftada 4+ gün egzersiz yapıyorum)</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="fitnessGoal" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Fitness Hedefi
                  </label>
                  <select
                    id="fitnessGoal"
                    name="fitnessGoal"
                    value={formData.fitnessGoal}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Kilo Verme">Kilo Verme</option>
                    <option value="Kilo Alma">Kilo Alma</option>
                    <option value="Kas Kazanma">Kas Kazanma</option>
                    <option value="Genel Sağlık">Genel Sağlık</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col space-y-4 mt-6">
            <button 
              type="submit" 
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Kayıt yapılıyor...
                </span>
              ) : (
                'Kayıt Ol'
              )}
            </button>
            
            <div className="text-sm text-center">
              Zaten hesabınız var mı?{' '}
              <Link 
                href="/login" 
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                Giriş yapın
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
