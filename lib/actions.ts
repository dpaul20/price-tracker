"use server"

import { revalidatePath } from "next/cache"
import { scrapeProductInfo } from "./scraper"
import { StoreRepository, type CreateStoreInput } from "./repositories/store-repository"
import { ProductRepository, type CreateProductInput } from "./repositories/product-repository"
import { PriceHistoryRepository } from "./repositories/price-history-repository"
import { PriceAlertRepository, type CreatePriceAlertInput } from "./repositories/price-alert-repository"
import { ScrapingLogRepository } from "./repositories/scraping-log-repository"
import { logger } from "./logger"

// Repositories
const storeRepository = new StoreRepository()
const productRepository = new ProductRepository()
const priceHistoryRepository = new PriceHistoryRepository()
const priceAlertRepository = new PriceAlertRepository()
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const scrapingLogRepository = new ScrapingLogRepository()

export async function trackProduct(url: string) {
  try {
    // Verificar si el producto ya existe
    const existingProduct = await productRepository.findByUrl(url)

    if (existingProduct) {
      return {
        success: true,
        message: "El producto ya está siendo rastreado",
        productId: existingProduct.id,
      }
    }

    // Obtener información del producto mediante scraping
    const productInfo = await scrapeProductInfo(url)

    if (!productInfo) {
      return {
        success: false,
        error: "No se pudo obtener información del producto",
      }
    }

    // Determinar la tienda basada en la URL
    const hostname = new URL(url).hostname
    let store = await storeRepository.findByDomain(hostname)

    // Si la tienda no existe, crearla
    if (!store) {
      const storeInput: CreateStoreInput = {
        name: hostname.replace("www.", ""),
        url: `https://${hostname}`,
        scrapeConfig: {
          priceSelector: productInfo.selectors?.price || "",
          nameSelector: productInfo.selectors?.name || "",
          imageSelector: productInfo.selectors?.image || "",
        },
      }

      store = await storeRepository.create(storeInput)
    }

    // Crear el producto
    const productInput: CreateProductInput = {
      url,
      name: productInfo.name,
      image: productInfo.image,
      currentPrice: productInfo.price,
      storeId: store.id,
    }

    const product = await productRepository.create(productInput)

    // Crear el primer registro en el histórico de precios
    await priceHistoryRepository.create({
      productId: product.id,
      price: productInfo.price,
    })

    revalidatePath("/")
    revalidatePath("/products")

    return {
      success: true,
      message: "Producto agregado correctamente",
      productId: product.id,
    }
  } catch (error) {
    logger.error("Error al rastrear producto:", error)
    return {
      success: false,
      error: "Error al procesar la solicitud",
    }
  }
}

export async function createPriceAlert(productId: string, userId: string, targetPrice: number) {
  try {
    const product = await productRepository.findById(productId)

    if (!product) {
      return {
        success: false,
        error: "Producto no encontrado",
      }
    }

    // Crear alerta de precio
    const alertInput: CreatePriceAlertInput = {
      productId,
      userId,
      targetPrice,
    }

    const alert = await priceAlertRepository.create(alertInput)

    return {
      success: true,
      message: "Alerta de precio creada correctamente",
      alertId: alert.id,
    }
  } catch (error) {
    logger.error("Error al crear alerta de precio:", error)
    return {
      success: false,
      error: "Error al procesar la solicitud",
    }
  }
}

export async function getProductDetails(productId: string) {
  try {
    const product = await productRepository.findById(productId)

    if (!product) {
      return {
        success: false,
        error: "Producto no encontrado",
      }
    }

    // Calculate percentage change
    const percentageChange = await productRepository.calculatePercentageChange(product)

    // Get lowest and highest prices
    const lowestPrice = await priceHistoryRepository.getLowestPrice(productId)
    const highestPrice = await priceHistoryRepository.getHighestPrice(productId)

    // Format last checked date
    const lastUpdated = new Intl.DateTimeFormat("es-AR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(product.lastChecked)

    return {
      success: true,
      product: {
        ...product,
        percentageChange,
        lowestPrice,
        highestPrice,
        lastUpdated,
      },
    }
  } catch (error) {
    logger.error(`Error al obtener detalles del producto ${productId}:`, error)
    return {
      success: false,
      error: "Error al procesar la solicitud",
    }
  }
}

export async function getProductPriceHistory(productId: string, period = "30d") {
  try {
    // Determine date range based on period
    const endDate = new Date()
    const startDate = new Date()

    switch (period) {
      case "7d":
        startDate.setDate(startDate.getDate() - 7)
        break
      case "30d":
        startDate.setDate(startDate.getDate() - 30)
        break
      case "90d":
        startDate.setDate(startDate.getDate() - 90)
        break
      case "1y":
        startDate.setFullYear(startDate.getFullYear() - 1)
        break
      default:
        startDate.setDate(startDate.getDate() - 30) // Default to 30 days
    }

    const priceHistory = await priceHistoryRepository.findByProductIdAndDateRange(productId, startDate, endDate)

    return {
      success: true,
      priceHistory: priceHistory.map((record) => ({
        date: record.timestamp.toISOString(),
        price: record.price,
      })),
    }
  } catch (error) {
    logger.error(`Error al obtener historial de precios para ${productId}:`, error)
    return {
      success: false,
      error: "Error al procesar la solicitud",
    }
  }
}

export async function getLatestProducts(limit = 6) {
  try {
    const products = await productRepository.getLatestProducts(limit)

    // Calculate percentage change for each product
    const productsWithChange = await Promise.all(
      products.map(async (product) => {
        const percentageChange = await productRepository.calculatePercentageChange(product)

        // Format last checked date
        const lastUpdated = new Intl.DateTimeFormat("es-AR", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(product.lastChecked)

        return {
          ...product,
          percentageChange,
          lastUpdated,
        }
      }),
    )

    return {
      success: true,
      products: productsWithChange,
    }
  } catch (error) {
    logger.error("Error al obtener productos recientes:", error)
    return {
      success: false,
      error: "Error al procesar la solicitud",
    }
  }
}

