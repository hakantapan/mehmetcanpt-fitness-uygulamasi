'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      })

      if (result?.error) {
        setError('E-posta veya şifre hatalı')
      } else {
        const callbackUrl = searchParams.get('callbackUrl')

        if (callbackUrl) {
          router.push(callbackUrl)
        } else {
          try {
            const storedPackage = window.localStorage.getItem('pendingPackageSelection')
            if (storedPackage) {
              window.localStorage.removeItem('pendingPackageSelection')
              router.push(`/paket-satin-al?paket=${storedPackage}`)
              router.refresh()
              return
            }
          } catch (_error) {
            // localStorage erişilemiyorsa normal akış devam etsin
          }
          router.push('/')
        }

        try {
          window.localStorage.removeItem('pendingPackageSelection')
        } catch (_error) {
          // localStorage erişilemiyorsa sessizce geç
        }

        router.refresh()
      }
    } catch (error) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Giriş Yap</CardTitle>
          <CardDescription className="text-center">
            Hesabınıza giriş yapın
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                placeholder="ornek@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-2 border-gray-300 focus:border-blue-500 bg-white"
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-2 border-gray-300 focus:border-blue-500 bg-white"
                required
                disabled={isLoading}
              />
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4 mt-6">
            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Giriş yapılıyor...
                </>
              ) : (
                'Giriş Yap'
              )}
            </Button>
            
            <div className="text-sm text-center space-y-2">
              <Link 
                href="/forgot-password" 
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Şifremi unuttum
              </Link>
              
              <div>
                Hesabınız yok mu?{' '}
                <Link 
                  href="/register" 
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                >
                  Kayıt olun
                </Link>
              </div>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
