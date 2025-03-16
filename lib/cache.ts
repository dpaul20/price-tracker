import { Redis } from "@upstash/redis"
import { logger } from "./logger"

// Initialize Redis client with Upstash
const redis = Redis.fromEnv()

// Prefijos para diferentes tipos de caché
const CACHE_KEYS = {
  PRODUCT_INFO: "product_info:",
  PRICE_HISTORY: "price_history:",
  STORE_CONFIG: "store_config:",
  ANALYSIS: "analysis:",
}

// Tiempos de expiración (en segundos)
const TTL = {
  PRODUCT_INFO: 60 * 60, // 1 hora
  PRICE_HISTORY: 60 * 60 * 24, // 24 horas
  STORE_CONFIG: 60 * 60 * 24 * 7, // 1 semana
  ANALYSIS: 60 * 60 * 3, // 3 horas
}

// Funciones genéricas de caché
export async function getCached<T>(key: string, fetcher: () => Promise<T>, ttl: number): Promise<T> {
  try {
    // Intentar obtener del caché
    const cached = await redis.get(key)

    if (cached) {
      return cached as T
    }

    // Si no está en caché, obtener datos frescos
    const data = await fetcher()

    // Guardar en caché
    await redis.set(key, data, { ex: ttl })

    return data
  } catch (error: any) {
    logger.error(`Error de caché para ${key}: ${(error as Error).message}`)
    // Si hay error en el caché, ejecutar el fetcher directamente
    return await fetcher()
  }
}

export async function invalidateCache(key: string): Promise<void> {
  try {
    await redis.del(key)
  } catch (error: any) {
    logger.error(`Error al invalidar caché ${key}: ${(error as Error).message}`)
  }
}

// Funciones específicas para el rastreador de precios
export async function getCachedProductInfo<T>(productId: string, fetcher: () => Promise<T>): Promise<T> {
  return getCached(`${CACHE_KEYS.PRODUCT_INFO}${productId}`, fetcher, TTL.PRODUCT_INFO)
}

export async function getCachedPriceHistory<T>(
  productId: string,
  period: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  return getCached(`${CACHE_KEYS.PRICE_HISTORY}${productId}:${period}`, fetcher, TTL.PRICE_HISTORY)
}

export async function getCachedAnalysis<T>(type: string, params: string, fetcher: () => Promise<T>): Promise<T> {
  return getCached(`${CACHE_KEYS.ANALYSIS}${type}:${params}`, fetcher, TTL.ANALYSIS)
}

export async function invalidateProductCache(productId: string): Promise<void> {
  try {
    // Obtener todas las claves que coinciden con el patrón
    const keys = await redis.keys(`${CACHE_KEYS.PRODUCT_INFO}${productId}*`)
    const historyKeys = await redis.keys(`${CACHE_KEYS.PRICE_HISTORY}${productId}*`)
    const analysisKeys = await redis.keys(`${CACHE_KEYS.ANALYSIS}*${productId}*`)

    const allKeys = [...keys, ...historyKeys, ...analysisKeys]

    if (allKeys.length > 0) {
      for (const key of allKeys) {
        await redis.del(key)
      }
      logger.info(`Caché invalidado para producto ${productId}: ${allKeys.length} claves`)
    }
  } catch (error: any) {
    logger.error(`Error al invalidar caché para producto ${productId}: ${(error as Error).message}`)
  }
}

