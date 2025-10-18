"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center space-y-4 text-center">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tighter">Bir şeyler yanlış gitti</h1>
        <p className="text-muted-foreground">
          Üzgünüz, bir hata oluştu. Lütfen tekrar deneyin.
        </p>
      </div>
      <Button onClick={reset}>Tekrar Dene</Button>
    </div>
  )
}
