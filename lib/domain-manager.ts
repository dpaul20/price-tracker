import { logger } from "./logger"

// Clase para gestionar la frecuencia de scraping por dominio
export class DomainManager {
  private static instance: DomainManager
  private domainStats: Map<
    string,
    {
      successCount: number
      failCount: number
      lastSuccess: number
      lastFail: number
      backoffLevel: number
    }
  > = new Map()

  private constructor() {}

  public static getInstance(): DomainManager {
    if (!DomainManager.instance) {
      DomainManager.instance = new DomainManager()
    }
    return DomainManager.instance
  }

  // Registrar éxito de scraping para un dominio
  public registerSuccess(domain: string): void {
    const stats = this.getStats(domain)
    stats.successCount++
    stats.lastSuccess = Date.now()

    // Reducir nivel de backoff si hay éxitos consecutivos
    if (stats.backoffLevel > 0 && stats.successCount > 3) {
      stats.backoffLevel = Math.max(0, stats.backoffLevel - 1)
      logger.info(`Reduciendo nivel de backoff para ${domain} a ${stats.backoffLevel}`)
    }

    this.domainStats.set(domain, stats)
  }

  // Registrar fallo de scraping para un dominio
  public registerFailure(domain: string): void {
    const stats = this.getStats(domain)
    stats.failCount++
    stats.lastFail = Date.now()

    // Aumentar nivel de backoff
    stats.backoffLevel = Math.min(5, stats.backoffLevel + 1)
    logger.warn(`Aumentando nivel de backoff para ${domain} a ${stats.backoffLevel}`)

    this.domainStats.set(domain, stats)
  }

  // Obtener tiempo de espera recomendado para un dominio
  public getRecommendedWaitTime(domain: string): number {
    const stats = this.getStats(domain)

    // Tiempos base de espera según nivel de backoff (en milisegundos)
    const baseWaitTimes = [
      3000, // Nivel 0: 3 segundos
      60000, // Nivel 1: 1 minuto
      300000, // Nivel 2: 5 minutos
      900000, // Nivel 3: 15 minutos
      3600000, // Nivel 4: 1 hora
      21600000, // Nivel 5: 6 horas
    ]

    // Añadir componente aleatorio para evitar patrones
    const baseTime = baseWaitTimes[stats.backoffLevel]
    const randomFactor = 0.8 + Math.random() * 0.4 // Entre 0.8 y 1.2

    return Math.floor(baseTime * randomFactor)
  }

  // Verificar si un dominio está en periodo de enfriamiento
  public isDomainCooling(domain: string): boolean {
    const stats = this.getStats(domain)

    if (stats.backoffLevel === 0) return false

    const now = Date.now()
    const lastFailTime = stats.lastFail || 0
    const cooldownTime = this.getRecommendedWaitTime(domain)

    return now - lastFailTime < cooldownTime
  }

  // Obtener estadísticas de un dominio
  private getStats(domain: string) {
    if (!this.domainStats.has(domain)) {
      this.domainStats.set(domain, {
        successCount: 0,
        failCount: 0,
        lastSuccess: 0,
        lastFail: 0,
        backoffLevel: 0,
      })
    }

    return this.domainStats.get(domain)!
  }
}

