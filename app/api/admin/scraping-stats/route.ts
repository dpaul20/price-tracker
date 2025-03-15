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
    const days = Number.parseInt(searchParams.get("days") || "7", 10)

    // Generar informe
    const report = await ScrapingMonitor.generatePerformanceReport()

    return NextResponse.json(report)
  } catch (error) {
    logger.error("Error generando estadísticas de scraping:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

