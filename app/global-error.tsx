"use client"

import { Button } from "@/components/ui/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="tr">
      <body>
        <div className="flex h-screen w-full flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tighter">Kritik Bir Hata Oluştu</h1>
            <p className="text-muted-foreground">
              Üzgünüz, uygulamada kritik bir hata oluştu. Lütfen tekrar deneyin.
            </p>
          </div>
          <Button onClick={reset}>Tekrar Dene</Button>
        </div>
      </body>
    </html>
  )
}
