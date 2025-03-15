import { NextResponse } from "next/server"
import { PriceAnalytics } from "@/lib/analytics"
import { logger } from "@/lib/logger"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const productId = params.id

    if (!productId) {
      return NextResponse.json({ error: "ID de producto requerido" }, { status: 400 })
    }

    const analysis = await PriceAnalytics.getSeasonalAnalysis(productId)

    return NextResponse.json(analysis)
  } catch (error) {
    logger.error(`Error obteniendo análisis estacional para producto ${params.id}:`, error)
    return NextResponse.json({ error: "No hay suficientes datos para generar un análisis estacional" }, { status: 404 })
  }
}

