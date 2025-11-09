import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { exec } from "child_process"
import { promisify } from "util"
import { join } from "path"
import { readdir, stat, mkdir } from "fs/promises"
import { existsSync } from "fs"

const execAsync = promisify(exec)

async function ensureAdmin(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }
  return { user }
}

export async function POST(request: NextRequest) {
  const auth = await ensureAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    const backupScript = join(process.cwd(), "scripts", "backup.sh")
    
    // Script'in var olup olmadığını kontrol et
    if (!existsSync(backupScript)) {
      return NextResponse.json(
        {
          error: "Yedekleme scripti bulunamadı",
          details: `Script yolu: ${backupScript}`,
        },
        { status: 500 }
      )
    }

    let stdout = ""
    let stderr = ""
    let exitCode = 0

    try {
      const result = await execAsync(`bash "${backupScript}"`, {
        cwd: process.cwd(),
        timeout: 300000, // 5 dakika timeout
        env: {
          ...process.env,
          PATH: process.env.PATH || "/usr/local/bin:/usr/bin:/bin",
        },
      })
      stdout = result.stdout || ""
      stderr = result.stderr || ""
    } catch (error: any) {
      // Script çalıştı ama hata döndü
      stdout = error.stdout || ""
      stderr = error.stderr || ""
      exitCode = error.code || 1
      
      // Yine de yedek dosyasını kontrol et - belki oluşmuştur
    }

    // Yedek dosyasını bul
    const backupsDir = join(process.cwd(), "backups")
    
    // Klasör yoksa oluştur
    if (!existsSync(backupsDir)) {
      await mkdir(backupsDir, { recursive: true })
    }

    let files: string[] = []
    try {
      files = await readdir(backupsDir)
    } catch (error) {
      // Klasör yoksa boş liste
      files = []
    }

    const backupFiles = files.filter(f => f.endsWith(".tar.gz")).sort().reverse()
    
    let latestBackup = null
    if (backupFiles.length > 0) {
      const latestPath = join(backupsDir, backupFiles[0])
      const stats = await stat(latestPath)
      latestBackup = {
        name: backupFiles[0],
        size: stats.size,
        createdAt: stats.birthtime,
      }
    }

    // Yedek dosyası oluştuysa başarılı say
    if (latestBackup) {
      return NextResponse.json({
        message: "Yedekleme başarıyla tamamlandı",
        output: stdout,
        warnings: stderr ? [stderr] : undefined,
        backup: latestBackup,
      })
    } else {
      // Yedek dosyası yoksa hata döndür
      return NextResponse.json(
        {
          error: "Yedekleme işlemi başarısız oldu",
          details: {
            message: "Yedek dosyası oluşturulamadı",
            stdout: stdout || null,
            stderr: stderr || null,
            exitCode: exitCode,
          },
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error("Backup error:", error)
    const errorDetails = {
      message: error.message || "Bilinmeyen hata",
      stdout: error.stdout || null,
      stderr: error.stderr || null,
      code: error.code || null,
    }
    
    return NextResponse.json(
      {
        error: "Yedekleme işlemi başarısız oldu",
        details: errorDetails,
      },
      { status: 500 }
    )
  }
}

