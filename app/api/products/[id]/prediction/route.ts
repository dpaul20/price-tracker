import { NextResponse } from "next/server"
import { PriceAnalytics } from "@/lib/analytics"
import { logger } from "@/lib/logger"

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const productId = params.id

    if (!productId) {
      return NextResponse.json({ error: "ID de producto requerido" }, { status: 400 })
    }

    const prediction = await PriceAnalytics.predictPrice(productId)

    return NextResponse.json(prediction)
  } catch (error: any) {
    logger.error(`Error obteniendo predicción para producto ${params.id}:`, error)
    return NextResponse.json({ error: "No hay suficientes datos para generar una predicción" }, { status: 404 })
  }
}

