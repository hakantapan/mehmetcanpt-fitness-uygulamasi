import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { exec } from "child_process"
import { promisify } from "util"
import { readFile } from "fs/promises"
import { join } from "path"

const execAsync = promisify(exec)

// Deployment durumunu kontrol et
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")

    // .env.deploy dosyasını kontrol et
    const envDeployPath = join(process.cwd(), ".env.deploy")
    let deployConfig = null
    
    try {
      const envContent = await readFile(envDeployPath, "utf-8")
      // Basit parse (production için daha güvenli bir parser kullanılabilir)
      const lines = envContent.split("\n")
      deployConfig = {
        host: lines.find(l => l.startsWith("DEPLOY_HOST"))?.split("=")[1]?.trim() || null,
        user: lines.find(l => l.startsWith("DEPLOY_USER"))?.split("=")[1]?.trim() || null,
        path: lines.find(l => l.startsWith("DEPLOY_PATH"))?.split("=")[1]?.trim() || null,
      }
    } catch (error) {
      // .env.deploy dosyası yok
    }

    if (action === "status") {
      // Sunucu bağlantısını test et
      let serverStatus = "unknown"
      if (deployConfig?.host && deployConfig?.user) {
        try {
          await execAsync(`timeout 5 ssh -o ConnectTimeout=5 -o BatchMode=yes ${deployConfig.user}@${deployConfig.host} "echo ok" 2>&1`)
          serverStatus = "online"
        } catch (error) {
          serverStatus = "offline"
        }
      }

      return NextResponse.json({
        configured: !!deployConfig?.host,
        serverStatus,
        config: deployConfig,
      })
    }

    return NextResponse.json({ error: "Geçersiz action" }, { status: 400 })
  } catch (error) {
    console.error("Deployment status error:", error)
    return NextResponse.json(
      { error: "Durum kontrol edilemedi" },
      { status: 500 }
    )
  }
}

// Deployment işlemi başlat
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 })
    }

    const body = await request.json()
    const { type, action } = body // type: "deploy" | "pull", action: "all" | "code" | "db"

    if (!type || !action) {
      return NextResponse.json({ error: "Geçersiz parametreler" }, { status: 400 })
    }

    // Script yolunu belirle
    let scriptPath = ""
    if (type === "deploy") {
      if (action === "all") {
        scriptPath = "scripts/deploy-all-docker.sh"
      } else if (action === "code") {
        scriptPath = "scripts/deploy-docker.sh"
      } else if (action === "db") {
        scriptPath = "scripts/sync-db-docker.sh"
      }
    } else if (type === "pull") {
      if (action === "all") {
        scriptPath = "scripts/pull-from-production.sh all"
      } else if (action === "db") {
        scriptPath = "scripts/pull-db-docker.sh"
      } else if (action === "files") {
        scriptPath = "scripts/pull-from-production.sh files"
      }
    }

    if (!scriptPath) {
      return NextResponse.json({ error: "Geçersiz işlem tipi" }, { status: 400 })
    }

    // Script'i arka planda çalıştır
    const { spawn } = require("child_process")
    const scriptParts = scriptPath.split(" ")
    const scriptFile = scriptParts[0]
    const scriptArgs = scriptParts.slice(1)
    
    const scriptProcess = spawn("bash", [scriptFile, ...scriptArgs], {
      cwd: process.cwd(),
      env: { ...process.env, AUTO_CONFIRM: "true" },
      detached: true,
      stdio: "ignore",
    })
    
    scriptProcess.unref() // Parent process'i beklemeden çalıştır
    
    // İşlem arka planda çalışıyor, loglar console'a yazılacak
    console.log(`Deployment ${type} ${action} started with PID: ${scriptProcess.pid}`)

    // Hemen response dön (async işlem)
    return NextResponse.json({
      success: true,
      message: `${type === "deploy" ? "Deploy" : "Pull"} işlemi başlatıldı`,
      processId: scriptProcess.pid,
    })
  } catch (error) {
    console.error("Deployment action error:", error)
    return NextResponse.json(
      { error: "İşlem başlatılamadı" },
      { status: 500 }
    )
  }
}

