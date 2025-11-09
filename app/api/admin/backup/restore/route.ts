import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { exec } from "child_process"
import { promisify } from "util"
import { join, relative, resolve } from "path"
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
    const body = await request.json()
    const { backupName } = body

    if (!backupName) {
      return NextResponse.json({ error: "Yedek dosyası adı gerekli" }, { status: 400 })
    }

    const backupsDir = join(process.cwd(), "backups")
    const backupPath = resolve(backupsDir, backupName)
    const relativePath = relative(backupsDir, backupPath)
    const hasTraversal =
      !relativePath ||
      relativePath.startsWith("..") ||
      relativePath.split(/[\\/]/).some((segment) => segment === "..")

    if (hasTraversal || !existsSync(backupPath)) {
      return NextResponse.json({ error: "Geçersiz yedek dosyası" }, { status: 400 })
    }

    const restoreScript = join(process.cwd(), "scripts", "restore.sh")
    
    const { stdout, stderr } = await execAsync(`bash ${restoreScript} "${backupPath}"`, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        AUTO_CONFIRM: "true", // Otomatik onay
      },
      timeout: 600000, // 10 dakika timeout
    })

    return NextResponse.json({
      message: "Geri yükleme başarıyla tamamlandı",
      output: stdout,
      warnings: stderr ? [stderr] : undefined,
    })
  } catch (error: any) {
    console.error("Restore error:", error)
    return NextResponse.json(
      {
        error: "Geri yükleme işlemi başarısız oldu",
        details: error.message || error.stderr || "Bilinmeyen hata",
      },
      { status: 500 }
    )
  }
}
