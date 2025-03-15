import { prisma } from "./database"

// Función para guardar un nuevo registro de precio
export async function savePrice(productId: string, price: number, url: string) {
  return await prisma.priceHistory.create({
    data: {
      price,
      timestamp: new Date(),
      product: {
        connect: {
          id: productId,
        },
      },
    },
  })
}

// Función para programar el seguimiento de un nuevo producto
export async function trackNewProduct(url: string, name: string, initialPrice: number, storeId: string) {
  // Primero creamos el producto si no existe
  const product = await prisma.product.upsert({
    where: {
      url,
    },
    update: {
      name,
      currentPrice: initialPrice,
      lastChecked: new Date(),
    },
    create: {
      url,
      name,
      currentPrice: initialPrice,
      lastChecked: new Date(),
      store: {
        connect: {
          id: storeId,
        },
      },
    },
  })

  // Luego guardamos el primer registro de precio
  await prisma.priceHistory.create({
    data: {
      price: initialPrice,
      timestamp: new Date(),
      product: {
        connect: {
          id: product.id,
        },
      },
    },
  })

  return product
}

// Función para actualizar precios de todos los productos
export async function updateAllProductPrices() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      url: true,
      currentPrice: true,
      store: {
        select: {
          id: true,
          name: true,
          scrapeConfig: true,
        },
      },
    },
  })

  const results = []

  for (const product of products) {
    try {
      // Aquí iría la lógica de scraping basada en product.store.scrapeConfig
      const newPrice = await scrapeProductPrice(product.url, product.store.scrapeConfig)

      // Solo guardamos en el histórico si el precio cambió
      if (newPrice !== product.currentPrice) {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            currentPrice: newPrice,
            previousPrice: product.currentPrice,
            lastChecked: new Date(),
          },
        })

        await prisma.priceHistory.create({
          data: {
            price: newPrice,
            timestamp: new Date(),
            product: {
              connect: {
                id: product.id,
              },
            },
          },
        })

        // Verificar alertas de precio
        await checkPriceAlerts(product.id, newPrice)

        results.push({
          productId: product.id,
          oldPrice: product.currentPrice,
          newPrice,
          changed: true,
        })
      } else {
        // Actualizamos la fecha de última verificación
        await prisma.product.update({
          where: { id: product.id },
          data: { lastChecked: new Date() },
        })

        results.push({
          productId: product.id,
          price: newPrice,
          changed: false,
        })
      }
    } catch (error) {
      console.error(`Error updating price for product ${product.id}:`, error)
      results.push({
        productId: product.id,
        error: true,
        message: error.message,
      })
    }
  }

  return results
}

// Función simulada para el scraping de precios
async function scrapeProductPrice(url: string, scrapeConfig: any): Promise<number> {
  // En una implementación real, aquí usarías Puppeteer, Playwright o similar
  // para extraer el precio del sitio web

  // Simulación:
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simular un precio aleatorio para demostración
      const basePrice = 100 + Math.random() * 900
      resolve(Math.round(basePrice * 100) / 100)
    }, 500)
  })
}

// Función para verificar alertas de precio
async function checkPriceAlerts(productId: string, newPrice: number) {
  const alerts = await prisma.priceAlert.findMany({
    where: {
      productId,
      targetPrice: {
        gte: newPrice,
      },
      triggered: false,
    },
    include: {
      user: true,
    },
  })

  for (const alert of alerts) {
    // Aquí enviarías la notificación al usuario
    // (email, push notification, etc.)

    // Marcar la alerta como activada
    await prisma.priceAlert.update({
      where: { id: alert.id },
      data: {
        triggered: true,
        triggeredAt: new Date(),
      },
    })
  }
}

