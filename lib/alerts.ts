import { prisma } from "./database"
import { logger } from "./logger"

// Función para verificar alertas de precio
export async function checkPriceAlerts(productId: string, newPrice: number) {
  try {
    // Buscar alertas que deban activarse
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
        product: true,
      },
    })

    logger.info(`Verificando alertas para producto ${productId}: ${alerts.length} alertas encontradas`)

    for (const alert of alerts) {
      try {
        // Enviar notificación al usuario
        await sendPriceAlertNotification(alert)

        // Marcar la alerta como activada
        await prisma.priceAlert.update({
          where: { id: alert.id },
          data: {
            triggered: true,
            triggeredAt: new Date(),
          },
        })

        logger.info(`Alerta ${alert.id} activada para usuario ${alert.userId}`)
      } catch (error) {
        logger.error(`Error procesando alerta ${alert.id}:`, error)
      }
    }

    return { processed: alerts.length }
  } catch (error) {
    logger.error(`Error verificando alertas para producto ${productId}:`, error)
    throw error
  }
}

// Función para enviar notificación
async function sendPriceAlertNotification(alert: any) {
  // En una implementación real, aquí enviarías un email, push notification, etc.
  logger.info(
    `[SIMULACIÓN] Enviando notificación a ${alert.user.email}: El precio de "${alert.product.name}" ha bajado a ${alert.product.currentPrice}`,
  )

  // Simular envío de notificación
  return new Promise((resolve) => setTimeout(resolve, 100))
}

