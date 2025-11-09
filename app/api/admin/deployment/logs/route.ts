import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { readFile, readdir } from "fs/promises"
import { join } from "path"

// Deployment loglarını getir
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50")

    // Log dosyalarını oku (eğer varsa)
    const logsDir = join(process.cwd(), "logs")
    let logs: Array<{ timestamp: string; level: string; message: string }> = []

    try {
      const files = await readdir(logsDir)
      const logFiles = files.filter(f => f.endsWith(".log")).sort().reverse().slice(0, 5)
      
      for (const file of logFiles) {
        try {
          const content = await readFile(join(logsDir, file), "utf-8")
          const lines = content.split("\n").filter(l => l.trim())
          
          for (const line of lines.slice(-limit)) {
            // Basit log parsing
            const match = line.match(/(\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2})[\s-]+(\w+)[\s-]+(.+)/)
            if (match) {
              logs.push({
                timestamp: match[1],
                level: match[2],
                message: match[3],
              })
            }
          }
        } catch (error) {
          // Log dosyası okunamadı, devam et
        }
      }
    } catch (error) {
      // Logs dizini yok veya okunamadı
    }

    // Son logları döndür
    return NextResponse.json({
      logs: logs.slice(-limit).reverse(),
      total: logs.length,
    })
  } catch (error) {
    console.error("Deployment logs error:", error)
    return NextResponse.json(
      { error: "Loglar yüklenemedi", logs: [] },
      { status: 500 }
    )
  }
}

