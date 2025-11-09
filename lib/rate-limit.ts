// Basit rate limiting implementasyonu
// Production'da Redis veya Upstash gibi bir servis kullanılmalı

type RateLimitStore = Map<string, { count: number; resetTime: number }>

const store: RateLimitStore = new Map()

// Store'u temizle (her 5 dakikada bir eski kayıtları sil)
const cleanupInterval = setInterval(() => {
  const now = Date.now()
  store.forEach((value, key) => {
    if (value.resetTime < now) {
      store.delete(key)
    }
  })
}, 5 * 60 * 1000)

// Cleanup interval'i process sonlandığında temizle
if (typeof process !== 'undefined') {
  process.on('SIGTERM', () => clearInterval(cleanupInterval))
  process.on('SIGINT', () => clearInterval(cleanupInterval))
}

export interface RateLimitOptions {
  maxRequests: number
  windowMs: number
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetTime: number
  error?: string
}

/**
 * Rate limiting kontrolü
 * @param identifier - Rate limit için benzersiz tanımlayıcı (IP, user ID, vb.)
 * @param options - Rate limit ayarları
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { maxRequests: 100, windowMs: 15 * 60 * 1000 } // Varsayılan: 15 dakikada 100 istek
): RateLimitResult {
  const now = Date.now()
  const key = identifier
  const record = store.get(key)

  if (!record || record.resetTime < now) {
    // Yeni pencere başlat
    const resetTime = now + options.windowMs
    store.set(key, { count: 1, resetTime })
    return {
      success: true,
      remaining: options.maxRequests - 1,
      resetTime,
    }
  }

  if (record.count >= options.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetTime: record.resetTime,
      error: 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.',
    }
  }

  // İsteği say
  record.count++
  store.set(key, record)

  return {
    success: true,
    remaining: options.maxRequests - record.count,
    resetTime: record.resetTime,
  }
}

/**
 * Rate limit sayacını sıfırla (başarılı işlemler için)
 */
export function resetRateLimit(identifier: string): void {
  store.delete(identifier)
}

/**
 * IP adresini request'ten al
 * NextRequest, Request ve Headers objelerini destekler
 */
export function getClientIdentifier(
  request: Request | { headers: Headers | { get: (key: string) => string | null } } | { ip?: string | null; headers: { get: (key: string) => string | null } }
): string {
  // NextRequest kontrolü (ip property'si varsa)
  if ('ip' in request && request.ip) {
    return request.ip
  }
  
  let headers: Headers | { get: (key: string) => string | null }
  
  if (request instanceof Request) {
    headers = request.headers
  } else if ('headers' in request) {
    headers = request.headers
  } else {
    return 'unknown'
  }
  
  const forwarded = headers.get('x-forwarded-for')
  const realIp = headers.get('x-real-ip')
  
  if (forwarded) {
    const [ip] = String(forwarded).split(',').map((s) => s.trim())
    if (ip) return ip
  }
  
  if (realIp) return String(realIp)
  
  return 'unknown'
}

/**
 * Rate limit middleware wrapper
 */
export function withRateLimit(
  handler: (request: Request) => Promise<Response>,
  options?: RateLimitOptions
) {
  return async (request: Request): Promise<Response> => {
    const identifier = getClientIdentifier(request)
    const rateLimitResult = checkRateLimit(identifier, options)

    if (!rateLimitResult.success) {
      return new Response(
        JSON.stringify({ error: rateLimitResult.error || 'Rate limit aşıldı' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(options?.maxRequests || 100),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(Math.ceil(rateLimitResult.resetTime / 1000)),
            'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)),
          },
        }
      )
    }

    const response = await handler(request)

    // Rate limit header'larını ekle
    response.headers.set('X-RateLimit-Limit', String(options?.maxRequests || 100))
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining))
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(rateLimitResult.resetTime / 1000)))

    return response
  }
}
