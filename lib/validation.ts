// Güvenlik validasyon fonksiyonları

/**
 * Şifre güvenlik kontrolü
 * Minimum 8 karakter, en az bir büyük harf, bir küçük harf ve bir rakam içermeli
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Şifre gereklidir' }
  }

  if (password.length < 8) {
    return { valid: false, error: 'Şifre en az 8 karakter olmalıdır' }
  }

  if (password.length > 128) {
    return { valid: false, error: 'Şifre çok uzun' }
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Şifre en az bir küçük harf içermelidir' }
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Şifre en az bir büyük harf içermelidir' }
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Şifre en az bir rakam içermelidir' }
  }

  return { valid: true }
}

/**
 * Güvenli dosya adı oluştur
 * Path traversal ve özel karakterleri önle
 */
export function sanitizeFileName(originalName: string, userId: string): string {
  // Dosya uzantısını al ve temizle
  const extension = originalName.split('.').pop()?.toLowerCase() || 'bin'
  
  // Güvenli uzantılar listesi
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif']
  const safeExtension = allowedExtensions.includes(extension) ? extension : 'bin'
  
  // Güvenli dosya adı oluştur: userId_timestamp_random.extension
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 9)
  
  return `${userId}_${timestamp}_${random}.${safeExtension}`
}

/**
 * Dosya içeriğini doğrula (magic bytes kontrolü)
 */
export async function validateImageFile(file: File): Promise<{ valid: boolean; error?: string }> {
  // MIME type kontrolü
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedMimeTypes.includes(file.type)) {
    return { valid: false, error: 'Desteklenmeyen dosya türü' }
  }

  // Dosya boyutu kontrolü (5MB)
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    return { valid: false, error: 'Dosya boyutu 5MB\'ı aşmamalıdır' }
  }

  if (file.size === 0) {
    return { valid: false, error: 'Dosya boş olamaz' }
  }

  // Magic bytes kontrolü (dosya içeriği doğrulama)
  try {
    const arrayBuffer = await file.slice(0, 12).arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    
    // JPEG: FF D8 FF
    const isJPEG = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    const isPNG = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47
    // GIF: 47 49 46 38
    const isGIF = bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38
    // WebP: RIFF...WEBP
    const isWebP = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
                   bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50

    if (!isJPEG && !isPNG && !isGIF && !isWebP) {
      return { valid: false, error: 'Dosya içeriği geçersiz görüntü formatı' }
    }
  } catch (error) {
    return { valid: false, error: 'Dosya doğrulanamadı' }
  }

  return { valid: true }
}

/**
 * Email formatı kontrolü
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim().toLowerCase())
}

