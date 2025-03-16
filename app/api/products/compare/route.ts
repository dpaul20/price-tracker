import { NextResponse } from "next/server"
import { PriceAnalytics } from "@/lib/analytics"
import { logger } from "@/lib/logger"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const productName = searchParams.get("name")

    if (!productName) {
      return NextResponse.json({ error: "Nombre de producto requerido" }, { status: 400 })
    }

    const comparison = await PriceAnalytics.compareStores(productName)

    return NextResponse.json(comparison)
  } catch (error: any) {
    logger.error(`Error comparando tiendas:`, error)
    return NextResponse.json({ error: "No se pudieron encontrar productos similares" }, { status: 404 })
  }
}

