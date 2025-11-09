import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { join, relative, resolve } from "path"
import { existsSync, createReadStream } from "fs"
import { stat } from "fs/promises"

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
    const { searchParams } = new URL(request.url)
    const backupName = searchParams.get("file")

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

    // Dosya istatistiklerini al
    const stats = await stat(backupPath)

    // Dosyayı stream olarak döndür
    const fileStream = createReadStream(backupPath)

    return new NextResponse(fileStream as any, {
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="${backupName}"`,
        "Content-Length": stats.size.toString(),
      },
    })
  } catch (error: any) {
    console.error("Download error:", error)
    return NextResponse.json(
      {
        error: "Yedek indirme başarısız oldu",
        details: error.message || "Bilinmeyen hata",
      },
      { status: 500 }
    )
  }
}
