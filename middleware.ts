import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })
  const isAuth = !!token
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || 
                     request.nextUrl.pathname.startsWith('/register')

  if (isAuthPage) {
    if (isAuth) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return null
  }

  // Korumalı sayfalar
  const protectedPaths = [
    '/bilgilerim',
    '/vucut-analizi',
    '/antrenman',
    '/beslenme',
    '/supplement',
    '/tarifler',
    '/isinma',
    '/gelisim',
    '/soru-merkezi',
    '/danisan',
    '/pt-formu',
    '/paket-satin-al'
  ]

  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath && !isAuth) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Admin sayfaları
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!isAuth || token.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Eğitmen sayfaları
  if (request.nextUrl.pathname.startsWith('/egitmen')) {
    if (!isAuth || token.role !== 'TRAINER') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
