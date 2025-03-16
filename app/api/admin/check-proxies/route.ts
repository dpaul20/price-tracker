import { NextResponse } from "next/server"
import { checkAllProxies } from "@/lib/proxy-checker"
import { logger } from "@/lib/logger"

export async function POST(request: Request) {
  try {
    // Verificar clave secreta para proteger el endpoint
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get("secret")

    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Obtener lista de proxies del cuerpo de la solicitud
    const body = await request.json()
    const { proxies } = body

    if (!Array.isArray(proxies) || proxies.length === 0) {
      return NextResponse.json({ error: "Se requiere una lista de proxies" }, { status: 400 })
    }

    // Verificar proxies
    const workingProxies = await checkAllProxies(proxies)

    return NextResponse.json({
      total: proxies.length,
      working: workingProxies.length,
      workingProxies,
    })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.error("Error verificando proxies:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

