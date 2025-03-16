import { NextResponse } from "next/server"
import { ScrapingMonitor } from "@/lib/monitoring"
import { logger } from "@/lib/logger"

export async function GET(request: Request) {
  try {
    // Verificar clave secreta para proteger el endpoint
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get("secret")

    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Obtener días para el informe (predeterminado: 7 días)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const days = Number.parseInt(searchParams.get("days") || "7", 10)

    // Generar informe
    const report = await ScrapingMonitor.generatePerformanceReport()

    return NextResponse.json(report)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.error("Error generando estadísticas de scraping:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

