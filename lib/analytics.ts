import { prisma } from "./database"
import { getCachedAnalysis, invalidateCache } from "./cache"
import { logger } from "./logger"

// Tipos para análisis
export interface PricePrediction {
  productId: string
  currentPrice: number
  predictedPrice: number
  confidence: number
  bestTimeToBuy: Date
  trend: "rising" | "falling" | "stable"
}

export interface SeasonalAnalysis {
  productId: string
  highSeasons: { start: Date; end: Date; avgPriceIncrease: number }[]
  lowSeasons: { start: Date; end: Date; avgPriceDecrease: number }[]
  bestMonthToBuy: number // 0-11 (Jan-Dec)
  worstMonthToBuy: number // 0-11 (Jan-Dec)
}

export interface StoreComparison {
  productName: string
  stores: {
    storeId: string
    storeName: string
    currentPrice: number
    lowestPriceEver: number
    averagePrice: number
    lastUpdated: Date
  }[]
}

// Clase principal para análisis de datos
export class PriceAnalytics {
  // Predecir precio futuro basado en histórico
  static async predictPrice(productId: string): Promise<PricePrediction> {
    return getCachedAnalysis("prediction", productId, async () => {
      try {
        // Obtener histórico de precios
        const priceHistory = await prisma.priceHistory.findMany({
          where: { productId },
          orderBy: { timestamp: "asc" },
        })

        if (priceHistory.length < 5) {
          throw new Error("Datos insuficientes para predicción")
        }

        // Obtener producto actual
        const product = await prisma.product.findUnique({
          where: { id: productId },
        })

        if (!product) {
          throw new Error("Producto no encontrado")
        }

        // Implementación simple de predicción lineal
        // En un caso real, usaríamos algoritmos más sofisticados
        const prices = priceHistory.map((p) => p.price)
        const timestamps = priceHistory.map((p) => p.timestamp.getTime())

        // Calcular tendencia usando regresión lineal simple
        const n = prices.length
        const sumX = timestamps.reduce((a, b) => a + b, 0)
        const sumY = prices.reduce((a, b) => a + b, 0)
        const sumXY = timestamps.reduce((sum, x, i) => sum + x * prices[i], 0)
        const sumXX = timestamps.reduce((sum, x) => sum + x * x, 0)

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
        const intercept = (sumY - slope * sumX) / n

        // Predecir precio para 30 días en el futuro
        const now = new Date().getTime()
        const futureTime = now + 30 * 24 * 60 * 60 * 1000
        const predictedPrice = slope * futureTime + intercept

        // Determinar tendencia
        let trend: "rising" | "falling" | "stable" = "stable"
        if (slope > 0.0001) trend = "rising"
        else if (slope < -0.0001) trend = "falling"

        // Calcular mejor momento para comprar
        let bestTimeToBuy = new Date()
        if (trend === "falling") {
          // Si el precio está bajando, esperar hasta que se estabilice
          const daysToWait = Math.min(
            30,
            Math.ceil(Math.abs(product.currentPrice - predictedPrice) / (Math.abs(slope) * 86400000)),
          )
          bestTimeToBuy = new Date(now + daysToWait * 24 * 60 * 60 * 1000)
        }

        // Calcular confianza basada en la varianza de los datos
        const meanPrice = sumY / n
        const variance = prices.reduce((sum, price) => sum + Math.pow(price - meanPrice, 2), 0) / n
        const stdDev = Math.sqrt(variance)
        const confidence = Math.max(0, Math.min(1, 1 - stdDev / meanPrice))

        return {
          productId,
          currentPrice: product.currentPrice,
          predictedPrice: Math.max(0, predictedPrice),
          confidence: Number.parseFloat(confidence.toFixed(2)),
          bestTimeToBuy,
          trend,
        }
      } catch (error: any) {
        logger.error(`Error en predicción de precio para ${productId}: ${error.message}`)
        throw error
      }
    })
  }

  // Análisis estacional
  static async getSeasonalAnalysis(productId: string): Promise<SeasonalAnalysis> {
    return getCachedAnalysis("seasonal", productId, async () => {
      try {
        // Obtener histórico de precios de al menos un año
        const oneYearAgo = new Date()
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

        const priceHistory = await prisma.priceHistory.findMany({
          where: {
            productId,
            timestamp: { gte: oneYearAgo },
          },
          orderBy: { timestamp: "asc" },
        })

        if (priceHistory.length < 30) {
          throw new Error("Datos insuficientes para análisis estacional")
        }

        // Agrupar precios por mes
        const pricesByMonth: number[][] = Array(12)
          .fill(null)
          .map(() => [])

        priceHistory.forEach((record) => {
          const month = record.timestamp.getMonth()
          pricesByMonth[month].push(record.price)
        })

        // Calcular precio promedio por mes
        const avgPriceByMonth = pricesByMonth.map((prices) => {
          if (prices.length === 0) return null
          return prices.reduce((sum, price) => sum + price, 0) / prices.length
        })

        // Encontrar meses con precios más altos y más bajos
        const validAvgPrices = avgPriceByMonth.filter((p) => p !== null)
        if (validAvgPrices.length < 2) {
          throw new Error("Datos insuficientes para análisis estacional")
        }

        const avgPrice = validAvgPrices.reduce((sum, price) => sum + price!, 0) / validAvgPrices.length

        const highSeasons: { start: Date; end: Date; avgPriceIncrease: number }[] = []
        const lowSeasons: { start: Date; end: Date; avgPriceDecrease: number }[] = []

        // Identificar temporadas altas y bajas
        let currentHighSeason: { start: number; end: number; increase: number } | null = null
        let currentLowSeason: { start: number; end: number; decrease: number } | null = null

        for (let i = 0; i < 12; i++) {
          if (avgPriceByMonth[i] === null) continue

          const priceDiff = (avgPriceByMonth[i]! - avgPrice) / avgPrice

          if (priceDiff > 0.05) {
            // 5% más alto que el promedio
            if (currentHighSeason === null) {
              currentHighSeason = { start: i, end: i, increase: priceDiff }
            } else {
              currentHighSeason.end = i
              currentHighSeason.increase = Math.max(currentHighSeason.increase, priceDiff)
            }

            if (currentLowSeason !== null) {
              // Finalizar temporada baja anterior
              const startDate = new Date()
              startDate.setMonth(currentLowSeason.start)
              startDate.setDate(1)

              const endDate = new Date()
              endDate.setMonth(currentLowSeason.end)
              endDate.setDate(28)

              lowSeasons.push({
                start: startDate,
                end: endDate,
                avgPriceDecrease: Number.parseFloat((currentLowSeason.decrease * 100).toFixed(2)),
              })

              currentLowSeason = null
            }
          } else if (priceDiff < -0.05) {
            // 5% más bajo que el promedio
            if (currentLowSeason === null) {
              currentLowSeason = { start: i, end: i, decrease: Math.abs(priceDiff) }
            } else {
              currentLowSeason.end = i
              currentLowSeason.decrease = Math.max(currentLowSeason.decrease, Math.abs(priceDiff))
            }

            if (currentHighSeason !== null) {
              // Finalizar temporada alta anterior
              const startDate = new Date()
              startDate.setMonth(currentHighSeason.start)
              startDate.setDate(1)

              const endDate = new Date()
              endDate.setMonth(currentHighSeason.end)
              endDate.setDate(28)

              highSeasons.push({
                start: startDate,
                end: endDate,
                avgPriceIncrease: Number.parseFloat((currentHighSeason.increase * 100).toFixed(2)),
              })

              currentHighSeason = null
            }
          }
        }

        // Finalizar temporadas pendientes
        if (currentHighSeason !== null) {
          const startDate = new Date()
          startDate.setMonth(currentHighSeason.start)
          startDate.setDate(1)

          const endDate = new Date()
          endDate.setMonth(currentHighSeason.end)
          endDate.setDate(28)

          highSeasons.push({
            start: startDate,
            end: endDate,
            avgPriceIncrease: Number.parseFloat((currentHighSeason.increase * 100).toFixed(2)),
          })
        }

        if (currentLowSeason !== null) {
          const startDate = new Date()
          startDate.setMonth(currentLowSeason.start)
          startDate.setDate(1)

          const endDate = new Date()
          endDate.setMonth(currentLowSeason.end)
          endDate.setDate(28)

          lowSeasons.push({
            start: startDate,
            end: endDate,
            avgPriceDecrease: Number.parseFloat((currentLowSeason.decrease * 100).toFixed(2)),
          })
        }

        // Encontrar mejor y peor mes para comprar
        let bestMonth = 0
        let worstMonth = 0
        let lowestPrice = Number.MAX_VALUE
        let highestPrice = 0

        avgPriceByMonth.forEach((price, month) => {
          if (price === null) return

          if (price < lowestPrice) {
            lowestPrice = price
            bestMonth = month
          }

          if (price > highestPrice) {
            highestPrice = price
            worstMonth = month
          }
        })

        return {
          productId,
          highSeasons,
          lowSeasons,
          bestMonthToBuy: bestMonth,
          worstMonthToBuy: worstMonth,
        }
      } catch (error: any) {
        logger.error(`Error en análisis estacional para ${productId}: ${error.message}`)
        throw error
      }
    })
  }

  // Comparación entre tiendas
  static async compareStores(productName: string): Promise<StoreComparison> {
    return getCachedAnalysis("stores", productName, async () => {
      try {
        // Buscar productos similares en diferentes tiendas
        const products = await prisma.product.findMany({
          where: {
            name: {
              contains: productName,
              mode: "insensitive",
            },
          },
          include: {
            store: true,
            priceHistory: {
              orderBy: { timestamp: "desc" },
              take: 1,
            },
          },
        })

        if (products.length === 0) {
          throw new Error("No se encontraron productos similares")
        }

        // Para cada producto, obtener el precio más bajo registrado
        const storeComparisons = await Promise.all(
          products.map(async (product) => {
            const lowestPrice = await prisma.priceHistory.findFirst({
              where: { productId: product.id },
              orderBy: { price: "asc" },
            })

            // Calcular precio promedio
            const avgPriceResult = await prisma.priceHistory.aggregate({
              where: { productId: product.id },
              _avg: { price: true },
            })

            return {
              storeId: product.storeId,
              storeName: product.store.name,
              currentPrice: product.currentPrice,
              lowestPriceEver: lowestPrice?.price || product.currentPrice,
              averagePrice: avgPriceResult._avg.price || product.currentPrice,
              lastUpdated: product.lastChecked,
            }
          }),
        )

        return {
          productName,
          stores: storeComparisons,
        }
      } catch (error: any) {
        logger.error(`Error en comparación de tiendas para "${productName}": ${error.message}`)
        throw error
      }
    })
  }

  // Invalidar caché de análisis cuando cambian los datos
  static async invalidateAnalysisCache(productId: string): Promise<void> {
    try {
      await invalidateCache(`analysis:prediction:${productId}`)
      await invalidateCache(`analysis:seasonal:${productId}`)

      // También invalidar comparaciones de tiendas que podrían incluir este producto
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { name: true },
      })

      if (product) {
        // Extraer palabras clave del nombre del producto
        const keywords = product.name
          .split(" ")
          .filter((word) => word.length > 3)
          .map((word) => `analysis:stores:${word}`)

        for (const key of keywords) {
          await invalidateCache(key)
        }
      }
    } catch (error: any) {
      logger.error(`Error invalidando caché de análisis para ${productId}: ${error.message}`)
    }
  }
}

