import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { readdir, stat } from "fs/promises"
import { join } from "path"

async function ensureAdmin(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }
  return { user }
}

export async function GET(request: NextRequest) {
  const auth = await ensureAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    const backupsDir = join(process.cwd(), "backups")
    
    try {
      const files = await readdir(backupsDir)
      const backupFiles = files.filter(f => f.endsWith(".tar.gz"))
      
      const backups = await Promise.all(
        backupFiles.map(async (file) => {
          const filePath = join(backupsDir, file)
          const stats = await stat(filePath)
          return {
            name: file,
            size: stats.size,
            sizeFormatted: formatBytes(stats.size),
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
          }
        })
      )

      // Tarihe göre sırala (en yeni önce)
      backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

      return NextResponse.json({
        backups,
        total: backups.length,
      })
    } catch (error: any) {
      if (error.code === "ENOENT") {
        // Klasör yoksa boş liste döndür
        return NextResponse.json({
          backups: [],
          total: 0,
        })
      }
      throw error
    }
  } catch (error: any) {
    console.error("Backup list error:", error)
    return NextResponse.json(
      {
        error: "Yedek listesi alınamadı",
        details: error.message || "Bilinmeyen hata",
      },
      { status: 500 }
    )
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i]
}

