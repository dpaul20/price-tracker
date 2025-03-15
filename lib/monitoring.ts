import { prisma } from "./database"
import { logger } from "./logger"

// Clase para monitorear el rendimiento del scraping
export class ScrapingMonitor {
  // Registrar intento de scraping
  static async logScrapingAttempt(url: string, success: boolean, errorMessage?: string) {
    try {
      const domain = new URL(url).hostname

      await prisma.scrapingLog.create({
        data: {
          url,
          domain,
          success,
          errorMessage,
          timestamp: new Date(),
        },
      })
    } catch (error) {
      logger.error(`Error registrando intento de scraping: ${error.message}`)
    }
  }

  // Obtener estadísticas de éxito por dominio
  static async getDomainStats(days = 7) {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const logs = await prisma.scrapingLog.groupBy({
        by: ["domain", "success"],
        where: {
          timestamp: {
            gte: startDate,
          },
        },
        _count: {
          id: true,
        },
      })

      // Procesar resultados para obtener tasas de éxito
      const domainStats = new Map<
        string,
        {
          total: number
          success: number
          failure: number
          successRate: number
        }
      >()

      logs.forEach((log) => {
        const domain = log.domain

        if (!domainStats.has(domain)) {
          domainStats.set(domain, {
            total: 0,
            success: 0,
            failure: 0,
            successRate: 0,
          })
        }

        const stats = domainStats.get(domain)!
        const count = log._count.id

        stats.total += count
        if (log.success) {
          stats.success += count
        } else {
          stats.failure += count
        }

        stats.successRate = stats.total > 0 ? (stats.success / stats.total) * 100 : 0

        domainStats.set(domain, stats)
      })

      return Array.from(domainStats.entries()).map(([domain, stats]) => ({
        domain,
        ...stats,
        successRate: Number.parseFloat(stats.successRate.toFixed(2)),
      }))
    } catch (error) {
      logger.error(`Error obteniendo estadísticas de dominio: ${error.message}`)
      return []
    }
  }

  // Identificar dominios problemáticos
  static async getProblematicDomains(successRateThreshold = 50) {
    try {
      const stats = await this.getDomainStats()

      return stats
        .filter((stat) => stat.total >= 5 && stat.successRate < successRateThreshold)
        .sort((a, b) => a.successRate - b.successRate)
    } catch (error) {
      logger.error(`Error identificando dominios problemáticos: ${error.message}`)
      return []
    }
  }

  // Generar informe de rendimiento
  static async generatePerformanceReport() {
    try {
      const stats = await this.getDomainStats()
      const problematicDomains = await this.getProblematicDomains()

      // Calcular estadísticas generales
      const totalAttempts = stats.reduce((sum, stat) => sum + stat.total, 0)
      const totalSuccess = stats.reduce((sum, stat) => sum + stat.success, 0)
      const overallSuccessRate = totalAttempts > 0 ? (totalSuccess / totalAttempts) * 100 : 0

      return {
        timestamp: new Date(),
        overallStats: {
          totalAttempts,
          totalSuccess,
          totalFailure: totalAttempts - totalSuccess,
          overallSuccessRate: Number.parseFloat(overallSuccessRate.toFixed(2)),
        },
        domainStats: stats,
        problematicDomains,
      }
    } catch (error) {
      logger.error(`Error generando informe de rendimiento: ${error.message}`)
      throw error
    }
  }
}

